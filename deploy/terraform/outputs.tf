output "public_ip" {
  description = "サーバーの固定 IP アドレス（DNS の A レコードに設定する）"
  value       = aws_eip.sonar.public_ip
}

output "instance_id" {
  description = "EC2 インスタンス ID"
  value       = aws_instance.sonar.id
}

output "ssh_command" {
  description = "SSH 接続コマンド"
  value       = "ssh root@${aws_eip.sonar.public_ip}"
}
