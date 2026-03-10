#!/usr/bin/env bash
set -e

# Load VPS_IP from sops encrypted secrets
if ! command -v sops &> /dev/null; then
  echo "Error: sops is not installed. Run: nix-shell -p sops"
  exit 1
fi

VPS_IP=$(sops -d --extract '["vps-ip"]' secrets/secrets.yaml 2>/dev/null)

if [ -z "$VPS_IP" ]; then
  echo "Error: vps-ip not found in secrets/secrets.yaml"
  echo "Add it with: sops secrets/secrets.yaml"
  exit 1
fi

echo "Deploying to $VPS_IP using deploy-rs (building on remote)..."
nix run github:serokell/deploy-rs -- \
  --remote-build \
  --skip-checks \
  --hostname $VPS_IP \
  .#ratmachine
