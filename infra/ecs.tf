/**
 * Runs hurricane-ready as a Fargate service behind a public ALB in the default
 * VPC. Reuses the ECR repo from main.tf; the Release workflow rolls deploys
 * with `aws ecs update-service --force-new-deployment` against the outputs
 * captured here as GitHub repo variables ECS_CLUSTER / ECS_SERVICE.
 */

# ---------- Network: default VPC ----------

data "aws_vpc" "default" {
  default = true
}

# CloudFront auto-creates this SG ("CloudFront-VPCOrigins-Service-SG") when
# the first VPC origin is provisioned in the account. We allow inbound from
# this SG so traffic only flows ALB-ward from CloudFront-managed ENIs.
data "aws_security_group" "cloudfront_vpc_origins" {
  filter {
    name   = "group-name"
    values = ["CloudFront-VPCOrigins-Service-SG"]
  }
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
  # CloudFront VPC Origins doesn't support us-east-1e (legacy AZ with reduced
  # service availability). Excluding it here so the ALB only lives in AZs the
  # VPC origin can attach to.
  filter {
    name   = "availability-zone"
    values = ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d", "us-east-1f"]
  }
}

# ---------- Logs ----------

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/hurricane-ready"
  retention_in_days = 7
}

# ---------- IAM ----------

# ECS uses this to pull from ECR and write logs. Trusted by the ECS tasks
# service principal; nothing else can assume it.
resource "aws_iam_role" "exec" {
  name = "hurricane-ready-ecs-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "exec_managed" {
  role       = aws_iam_role.exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Runtime secrets. The parameter VALUES live only in SSM (created out of band
# with `aws ssm put-parameter`), never in tofu state — referencing them by ARN
# rather than through a data source keeps it that way. Uses the default
# aws/ssm KMS key, so no kms:Decrypt grant is needed.
variable "google_weather_enabled" {
  description = "Inject GOOGLE_WEATHER_API_KEY from SSM. Set false if the parameter doesn't exist: ECS can't start a task whose secret is missing."
  type        = bool
  default     = true
}

locals {
  google_weather_param_arn = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/hurricane-ready/google-weather-api-key"
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role_policy" "exec_secrets" {
  count = var.google_weather_enabled ? 1 : 0
  name  = "read-app-secrets"
  role  = aws_iam_role.exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "ssm:GetParameters"
      Resource = local.google_weather_param_arn
    }]
  })
}

# Runtime identity of the container. Empty for now: DISABLE_AI=1 means no
# Bedrock/SES/SNS calls. When you flip DISABLE_AI=0 add an aws_iam_role_policy
# here granting bedrock:InvokeModel (and ses:SendEmail / sns:Publish for alerts).
resource "aws_iam_role" "task" {
  name = "hurricane-ready-ecs-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# ---------- Security groups ----------

resource "aws_security_group" "alb" {
  name = "hurricane-ready-alb"
  # NOTE: aws_security_group.description is ForceNew. Keep this in sync with
  # whatever AWS currently has — changing it triggers a destroy+create, and
  # ELB-related SG deletes can hang on internal AWS bookkeeping for 15+ min.
  description = "Public HTTP for hurricane-ready ALB"
  vpc_id      = data.aws_vpc.default.id

  # CloudFront-managed ENIs for the VPC origin belong to a CloudFront-owned
  # security group; allowing that SG by ID is the proper least-privilege
  # source. VPC CIDR alone wasn't sufficient empirically — the connection's
  # observed source identity differs from the ENI's IP. The SG ID is looked
  # up dynamically so it's not hardcoded across recreations.
  ingress {
    description     = "From CloudFront VPC origin"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [data.aws_security_group.cloudfront_vpc_origins.id]
  }

  egress {
    description = "ALB to tasks"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "tasks" {
  name        = "hurricane-ready-tasks"
  description = "ECS tasks accept traffic from the ALB only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "ALB to container port"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Egress to NHC and AWS APIs"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ---------- ALB ----------

resource "aws_lb" "app" {
  name               = "hurricane-ready-alb"
  internal           = true # CloudFront VPC origin reaches it over AWS's private network
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.default.ids
}

resource "aws_lb_target_group" "app" {
  name        = "hurricane-ready-tg"
  port        = 8080
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = data.aws_vpc.default.id

  health_check {
    path                = "/healthz"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  # Short drain so deploys are quick in sandbox.
  deregistration_delay = 15
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ---------- ECS ----------

resource "aws_ecs_cluster" "app" {
  name = "hurricane-ready"

  setting {
    name  = "containerInsights"
    value = "disabled"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "hurricane-ready"
  cpu                      = "256"
  memory                   = "512"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.exec.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = "app"
    image     = "${aws_ecr_repository.app.repository_url}:latest"
    essential = true
    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]
    environment = [
      { name = "REPLAY", value = "0" },
      { name = "DISABLE_AI", value = "1" },
      { name = "POLL_MINUTES", value = "15" }
    ]
    secrets = var.google_weather_enabled ? [
      { name = "GOOGLE_WEATHER_API_KEY", valueFrom = local.google_weather_param_arn }
    ] : []
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.app.name
        awslogs-region        = var.region
        awslogs-stream-prefix = "app"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://127.0.0.1:8080/healthz || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 10
    }
  }])
}

resource "aws_ecs_service" "app" {
  name            = "hurricane-ready"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # New tasks get time to boot before the ALB starts failing them.
  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }

  # The Release workflow rolls deploys with `update-service --force-new-deployment`
  # outside of Terraform's knowledge. Ignoring task_definition prevents TF from
  # reverting whatever the latest deploy left behind. desired_count is ignored
  # so manual scaling (or future autoscaling) doesn't drift either.
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.http]
}

# ---------- Outputs ----------

output "ecs_cluster" {
  description = "Set as ECS_CLUSTER repo variable"
  value       = aws_ecs_cluster.app.name
}

output "ecs_service" {
  description = "Set as ECS_SERVICE repo variable"
  value       = aws_ecs_service.app.name
}

output "alb_internal_dns" {
  description = "Internal ALB DNS — only reachable from inside the VPC / CloudFront VPC origin"
  value       = aws_lb.app.dns_name
}
