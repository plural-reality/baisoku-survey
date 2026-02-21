terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ------------------------------------------------------------------
# Security Group — HTTP(80), HTTPS(443), SSH(22) のみ許可
# ------------------------------------------------------------------
resource "aws_security_group" "sonar" {
  name_prefix = "sonar-"
  description = "Sonar application server"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sonar-sg"
  }
}

# ------------------------------------------------------------------
# EC2 Instance — NixOS
# ------------------------------------------------------------------
resource "aws_instance" "sonar" {
  ami           = var.nixos_ami
  instance_type = var.instance_type
  key_name      = var.key_name

  vpc_security_group_ids = [aws_security_group.sonar.id]

  root_block_device {
    volume_size = var.volume_size
    volume_type = "gp3"
  }

  tags = {
    Name = "sonar"
  }
}

# ------------------------------------------------------------------
# Elastic IP — サーバー再起動しても IP が変わらない
# ------------------------------------------------------------------
resource "aws_eip" "sonar" {
  instance = aws_instance.sonar.id
  domain   = "vpc"

  tags = {
    Name = "sonar-eip"
  }
}
