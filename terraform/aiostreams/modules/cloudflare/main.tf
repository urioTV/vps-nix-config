# Cloudflare Zero Trust Module for AIOStreams
# 
# Security Model:
# - /stremio/configure → Protected by email authentication
# - Stremio API paths → Publicly accessible (bypass)

# --- Tunnel Secret ---
resource "random_id" "tunnel_secret" {
  byte_length = 35
}

# --- Tunnel ---
resource "cloudflare_zero_trust_tunnel_cloudflared" "tunnel" {
  account_id    = var.cloudflare_account_id
  name          = var.tunnel_name
  tunnel_secret = base64encode(random_id.tunnel_secret.hex)
}

# --- Tunnel Token Data Source ---
data "cloudflare_zero_trust_tunnel_cloudflared_token" "tunnel_token" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.tunnel.id
}

# --- Tunnel Configuration ---
resource "cloudflare_zero_trust_tunnel_cloudflared_config" "tunnel_config" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.tunnel.id
  config = {
    ingress = [
      {
        hostname = var.domain_name
        service  = var.service_url
      },
      {
        service = "http_status:404"
      }
    ]
  }
}

# --- DNS Record ---
resource "cloudflare_dns_record" "tunnel_dns" {
  zone_id = var.cloudflare_zone_id
  name    = var.dns_record_name
  content = "${cloudflare_zero_trust_tunnel_cloudflared.tunnel.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

# =============================================================================
# ZERO TRUST ACCESS CONFIGURATION
# =============================================================================

# --- Bypass Policy for Stremio API Paths ---
resource "cloudflare_zero_trust_access_policy" "stremio_api_bypass" {
  account_id = var.cloudflare_account_id
  name       = "Stremio API Public Access"
  decision   = "bypass"

  include = [
    {
      everyone = {}
    }
  ]
}

# --- Allow Policy for Admin Email ---
resource "cloudflare_zero_trust_access_policy" "admin_allow" {
  account_id = var.cloudflare_account_id
  name       = "Admin Email Access"
  decision   = "allow"

  include = [
    {
      email = {
        email = var.admin_email
      }
    }
  ]
}

# --- Access Application for Stremio API (Bypass) ---
# Using wildcard to cover all API paths: manifest.json, catalog, meta, stream, subtitles
resource "cloudflare_zero_trust_access_application" "stremio_manifest" {
  account_id       = var.cloudflare_account_id
  name             = "AIOStreams - Manifest (Public)"
  type             = "self_hosted"
  session_duration = "24h"

  destinations = [
    { uri = "${var.domain_name}/manifest.json" },
    { uri = "${var.domain_name}/*/manifest.json" },
  ]

  policies = [
    { id = cloudflare_zero_trust_access_policy.stremio_api_bypass.id }
  ]
}

resource "cloudflare_zero_trust_access_application" "stremio_catalog" {
  account_id       = var.cloudflare_account_id
  name             = "AIOStreams - Catalog (Public)"
  type             = "self_hosted"
  session_duration = "24h"

  destinations = [
    { uri = "${var.domain_name}/catalog/*" },
    { uri = "${var.domain_name}/*/catalog/*" },
  ]

  policies = [
    { id = cloudflare_zero_trust_access_policy.stremio_api_bypass.id }
  ]
}

resource "cloudflare_zero_trust_access_application" "stremio_stream" {
  account_id       = var.cloudflare_account_id
  name             = "AIOStreams - Stream (Public)"
  type             = "self_hosted"
  session_duration = "24h"

  destinations = [
    { uri = "${var.domain_name}/stream/*" },
    { uri = "${var.domain_name}/*/stream/*" },
  ]

  policies = [
    { id = cloudflare_zero_trust_access_policy.stremio_api_bypass.id }
  ]
}

resource "cloudflare_zero_trust_access_application" "stremio_meta" {
  account_id       = var.cloudflare_account_id
  name             = "AIOStreams - Meta (Public)"
  type             = "self_hosted"
  session_duration = "24h"

  destinations = [
    { uri = "${var.domain_name}/meta/*" },
    { uri = "${var.domain_name}/*/meta/*" },
  ]

  policies = [
    { id = cloudflare_zero_trust_access_policy.stremio_api_bypass.id }
  ]
}

resource "cloudflare_zero_trust_access_application" "stremio_subtitles" {
  account_id       = var.cloudflare_account_id
  name             = "AIOStreams - Subtitles (Public)"
  type             = "self_hosted"
  session_duration = "24h"

  destinations = [
    { uri = "${var.domain_name}/subtitles/*" },
    { uri = "${var.domain_name}/*/subtitles/*" },
  ]

  policies = [
    { id = cloudflare_zero_trust_access_policy.stremio_api_bypass.id }
  ]
}

# --- Access Application for Configure Page (Protected) ---
resource "cloudflare_zero_trust_access_application" "configure" {
  account_id       = var.cloudflare_account_id
  name             = "AIOStreams - Configure (Protected)"
  type             = "self_hosted"
  session_duration = "24h"

  destinations = [
    { uri = "${var.domain_name}/stremio/configure" },
    { uri = "${var.domain_name}/stremio/configure/*" },
  ]

  policies = [
    { id = cloudflare_zero_trust_access_policy.admin_allow.id }
  ]
}

# --- Access Application for Root/Homepage (Protected) ---
resource "cloudflare_zero_trust_access_application" "homepage" {
  account_id       = var.cloudflare_account_id
  name             = "AIOStreams - Homepage (Protected)"
  type             = "self_hosted"
  session_duration = "24h"

  destinations = [
    { uri = var.domain_name },
  ]

  policies = [
    { id = cloudflare_zero_trust_access_policy.admin_allow.id }
  ]
}
