#!/usr/bin/env bash
set -e

# Usage:
#   ./deploy.sh <machine>              - lookup <machine>-ip/user from secrets
#   ./deploy.sh <machine> <user@host>  - use direct address

MACHINE="${1:-ratmachine}"
TARGET="${2:-}"

# If TARGET not provided, lookup from secrets
if [ -z "$TARGET" ]; then
  if ! command -v sops &> /dev/null; then
    echo "Error: sops is not installed. Run: nix-shell -p sops"
    exit 1
  fi

  MACHINE_IP=$(sops -d --extract '["'$MACHINE'-ip"]' secrets/secrets.yaml 2>/dev/null)
  MACHINE_USER=$(sops -d --extract '["'$MACHINE'-user"]' secrets/secrets.yaml 2>/dev/null || echo "root")

  if [ -z "$MACHINE_IP" ]; then
    echo "Error: $MACHINE-ip not found in secrets/secrets.yaml"
    echo "Add it with: sops secrets/secrets.yaml"
    echo ""
    echo "Or use: $0 $MACHINE user@host"
    exit 1
  fi

  TARGET="${MACHINE_USER}@${MACHINE_IP}"
fi

echo "Deploying to $MACHINE ($TARGET) (building on remote)..."
nix run github:nix-community/nixos-anywhere -- \
  --build-on-remote \
  --generate-hardware-config nixos-generate-config ./hosts/$MACHINE/hardware-configuration.nix \
  --flake .#$MACHINE \
  --ssh-option ConnectTimeout=60 \
  --ssh-option ServerAliveInterval=15 \
  --ssh-option ServerAliveCountMax=10 \
  --option connect-timeout 60 \
  --print-build-logs \
  "$TARGET"
