#!/usr/bin/env bash
set -e

# Load VPS_IP from sops encrypted secrets
if ! command -v sops &> /dev/null; then
  echo "Error: sops is not installed. Run: nix-shell -p sops"
  exit 1
fi

VPS_IP=$(sops -d --extract '["vps-ip"]' secrets/secrets.yaml 2>/dev/null)
VPS_USER=$(sops -d --extract '["vps-user"]' secrets/secrets.yaml 2>/dev/null || echo "root")

if [ -z "$VPS_IP" ]; then
  echo "Error: vps-ip not found in secrets/secrets.yaml"
  echo "Add it with: sops secrets/secrets.yaml"
  exit 1
fi

echo "Deploying to $VPS_IP as ${VPS_USER}..."
nix run github:nix-community/nixos-anywhere -- \
  --generate-hardware-config nixos-generate-config ./hardware-configuration.nix \
  --flake .#ratmachine \
  ${VPS_USER}@$VPS_IP

