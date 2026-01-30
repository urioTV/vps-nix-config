# Cloudflare Module - Outputs

output "tunnel_id" {
  description = "ID of the Cloudflare tunnel"
  value       = cloudflare_zero_trust_tunnel_cloudflared.tunnel.id
}

output "tunnel_token" {
  description = "Token for cloudflared tunnel"
  value       = data.cloudflare_zero_trust_tunnel_cloudflared_token.tunnel_token.token
  sensitive   = true
}

output "domain_name" {
  description = "Full domain name"
  value       = var.domain_name
}
