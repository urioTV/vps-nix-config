#!/usr/bin/env bash
set -e

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found. Copy .env.example to .env and configure it."
  exit 1
fi

if [ -z "$VPS_IP" ]; then
  echo "Error: VPS_IP is not set in .env"
  exit 1
fi

echo "Deploying to $VPS_IP as ${VPS_USER:-root}..."
nix run github:nix-community/nixos-anywhere -- \
  --generate-hardware-config nixos-generate-config ./hardware-configuration.nix \
  --flake .#ratmachine \
  ${VPS_USER:-root}@$VPS_IP
