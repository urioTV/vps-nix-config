# --- Root Module Outputs ---
# These outputs are used by Ansible dynamic inventory

# --- Root Module Outputs ---

output "tunnel_id" {
  description = "ID of the Cloudflare tunnel"
  value       = module.cloudflare.tunnel_id
}

output "cloudflared_tunnel_token" {
  description = "Cloudflared tunnel token"
  value       = module.cloudflare.tunnel_token
  sensitive   = true
}

output "aiostreams_url" {
  description = "Public URL for AIOStreams"
  value       = "https://${module.cloudflare.domain_name}"
}
