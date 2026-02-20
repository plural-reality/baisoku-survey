variable "aws_region" {
  description = "AWS リージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "instance_type" {
  description = "EC2 インスタンスタイプ（t3.medium 以上推奨）"
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "SSH 接続に使う EC2 Key Pair 名"
  type        = string
}

variable "volume_size" {
  description = "EBS ボリュームサイズ (GB)"
  type        = number
  default     = 30
}

variable "ssh_cidr" {
  description = "SSH 接続を許可する CIDR（例: 自分の IP/32）"
  type        = string
  default     = "0.0.0.0/0"
}

variable "nixos_ami" {
  description = "NixOS AMI ID（リージョンによって異なる。DEPLOYMENT.md の手順で取得）"
  type        = string
}
