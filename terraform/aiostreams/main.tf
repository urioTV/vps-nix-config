# --- Provider Configuration ---

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# --- Cloudflare Module ---
module "cloudflare" {
  source = "./modules/cloudflare"

  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_zone_id    = var.cloudflare_zone_id
  domain_name           = var.domain_name
  dns_record_name       = var.dns_record_name
  admin_email           = var.admin_email

  # Pointing to the Kubernetes Service
  service_url = "http://aiostreams:3000"
  tunnel_name = "aiostreams-k8s"
}
