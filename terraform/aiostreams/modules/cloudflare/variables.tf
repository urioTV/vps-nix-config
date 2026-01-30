# Cloudflare Module - Variables

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  type        = string
}

variable "domain_name" {
  description = "Full domain name for the application (e.g., streams.example.com)"
  type        = string
}

variable "tunnel_name" {
  description = "Name of the Cloudflare tunnel"
  type        = string
  default     = "aiostreams-proxmox"
}

variable "dns_record_name" {
  description = "DNS record name (subdomain)"
  type        = string
  default     = "streams"
}

variable "service_url" {
  description = "URL of the backend service"
  type        = string
  default     = "http://localhost:3000"
}

variable "admin_email" {
  description = "Administrator email for Zero Trust authentication"
  type        = string
}
