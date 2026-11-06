/**
 * CI/CD wiring for Hurricane-Ready. Apply in the target AWS account, then set
 * GitHub repo variables from the outputs:
 *   AWS_DEPLOY_ROLE_ARN, ECR_REPOSITORY (and later ECS_CLUSTER/ECS_SERVICE).
 */
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region

  # The deploy role's ecs:UpdateService statement is conditioned on
  # aws:ResourceTag/project = "hurricane-ready" — tagging everything via
  # default_tags makes that condition impossible to miss on a new resource.
  default_tags {
    tags = {
      project = "hurricane-ready"
    }
  }
}

# Cross-account provider: assumes the Route53RecordWriter role in the DNS
# management account (438465156498) to write records in 246labs.cloud.
provider "aws" {
  alias  = "dns"
  region = "us-east-1"
  assume_role {
    role_arn    = var.dns_role_arn
    external_id = var.dns_external_id
  }
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "github_repo" {
  description = "GitHub org/repo allowed to assume the deploy role"
  type        = string
  default     = "christophercorbin/hurricane-ready"
}

variable "create_oidc_provider" {
  description = "Set false if this account already has the GitHub OIDC provider (e.g., from zero-downtime-pipeline)"
  type        = bool
  default     = true
}

# ---------- ECR ----------

resource "aws_ecr_repository" "app" {
  name = "hurricane-ready"
  # MUTABLE is required today because release.yml pushes `:latest` on every
  # deploy; switching to IMMUTABLE needs the deploy flow to reference images
  # by SHA in the ECS task definition. Tracked alongside #34 in a follow-up.
  image_tag_mutability = "MUTABLE"
  # Explicit encryption (#34, partial): AES256 is the AWS-managed default,
  # but making it explicit prevents a future state drift from quietly
  # removing encryption-at-rest if Terraform's defaulting ever changes.
  encryption_configuration {
    encryption_type = "AES256"
  }
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 20 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 20
      }
      action = { type = "expire" }
    }]
  })
}

# ---------- GitHub OIDC deploy role ----------

resource "aws_iam_openid_connect_provider" "github" {
  count           = var.create_oidc_provider ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

# The deploy role (hurricane-ready-github-deploy) and its policy moved to the central infra repo
# chrisfixesit/tofu-or-not-tofu (accounts/sandbox/github-deploy) on 2026-11-06.
# Change it there, not here.

# ---------- Outputs (become GitHub repo variables) ----------

output "github_deploy_role_arn" {
  description = "Set as AWS_DEPLOY_ROLE_ARN repo variable"
  value       = "arn:aws:iam::385467776718:role/hurricane-ready-github-deploy" # managed in tofu-or-not-tofu
}

output "ecr_repository" {
  description = "Set as ECR_REPOSITORY repo variable"
  value       = aws_ecr_repository.app.repository_url
}
