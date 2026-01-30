# --- Root Module Variables ---

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_account_id" {
  type = string
}

variable "cloudflare_zone_id" {
  type = string
}

variable "domain_name" {
  description = "Full domain name for AIOStreams (e.g., streams.example.com)"
  type        = string
}

variable "dns_record_name" {
  description = "DNS subdomain name (e.g., streams)"
  type        = string
  default     = "streams"
}

variable "admin_email" {
  description = "Administrator email for Zero Trust authentication"
  type        = string
}
