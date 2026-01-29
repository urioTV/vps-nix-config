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

echo "Updating $VPS_IP as root..."
nixos-rebuild switch \
  --flake .#ratmachine \
  --target-host root@$VPS_IP
