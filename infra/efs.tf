/**
 * Durable storage for the app's own state (issue #88).
 *
 * `/data` holds state.json (threat level + level history) and
 * subscriptions.json (Web Push subscribers). Both were living on the task's
 * ephemeral writable layer, so every `update-service --force-new-deployment`
 * silently dropped every push subscriber. The Dockerfile has always declared
 * `VOLUME /data` and compose.yaml maps a named volume there for local runs —
 * this wires the same intent up on Fargate.
 *
 * NOTE: this does not address the single-task SPOF (#35). Shared storage
 * alone would not make a second task safe: both tasks would read the same
 * prior level, both compute levelChanged, and both dispatch before either
 * writes. That needs a lock or a single writer, not a filesystem.
 */

resource "aws_efs_file_system" "state" {
  creation_token = "hurricane-ready-state"
  encrypted      = true

  # Single-digit MB of JSON. Bursting is the right (and cheapest) mode; the
  # burst credit pool for a filesystem this small is never the bottleneck
  # because the app reads at boot and writes only on level change.
  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"

  tags = { Name = "hurricane-ready-state" }
}

# The app must never lose subscribers to a fat-fingered `tofu destroy`.
resource "aws_efs_backup_policy" "state" {
  file_system_id = aws_efs_file_system.state.id

  backup_policy {
    status = "ENABLED"
  }
}

# ---------- Access ----------

resource "aws_security_group" "efs" {
  name        = "hurricane-ready-efs"
  description = "NFS from hurricane-ready ECS tasks only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "NFS from tasks"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.tasks.id]
  }
}

# One mount target per AZ the service can place tasks in. These must cover
# every subnet in the service's network_configuration or a task scheduled
# into an uncovered AZ will hang and fail its mount.
resource "aws_efs_mount_target" "state" {
  for_each = toset(data.aws_subnets.default.ids)

  file_system_id  = aws_efs_file_system.state.id
  subnet_id       = each.value
  security_groups = [aws_security_group.efs.id]
}

# The container runs as `node` (uid/gid 1000 in node:22-alpine) and the image
# does `chown node:node /data`. Pinning the access point to the same POSIX
# identity means the app writes as itself rather than needing root, and every
# file it creates lands with a predictable owner.
resource "aws_efs_access_point" "state" {
  file_system_id = aws_efs_file_system.state.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/state"

    # EFS only applies creation_info when it creates the directory, so this
    # is what makes /state exist and be writable on the very first mount.
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "0755"
    }
  }

  tags = { Name = "hurricane-ready-state" }
}

# ---------- IAM ----------

# The task authenticates its mount with IAM (iam = "ENABLED" on the volume),
# so the mount is authorised by role identity as well as by security group.
# Scoped to this one access point — no ClientRootAccess.
resource "aws_iam_role_policy" "task_efs" {
  name = "hurricane-ready-efs-client"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "elasticfilesystem:ClientMount",
        "elasticfilesystem:ClientWrite",
      ]
      Resource = aws_efs_file_system.state.arn
      Condition = {
        StringEquals = {
          "elasticfilesystem:AccessPointArn" = aws_efs_access_point.state.arn
        }
      }
    }]
  })
}

output "efs_file_system_id" {
  description = "EFS backing /data (state.json + subscriptions.json)"
  value       = aws_efs_file_system.state.id
}
