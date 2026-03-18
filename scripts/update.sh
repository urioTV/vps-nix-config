#!/usr/bin/env bash
set -e

# Usage:
#   ./update.sh <machine>              - lookup <machine>-ip from secrets
#   ./update.sh <machine> <user@host>  - use direct address

MACHINE="${1:-ratmachine}"
TARGET="${2:-}"

# If TARGET not provided, lookup from secrets
if [ -z "$TARGET" ]; then
  if ! command -v sops &> /dev/null; then
    echo "Error: sops is not installed. Run: nix-shell -p sops"
    exit 1
  fi

  MACHINE_IP=$(sops -d --extract '["'$MACHINE'-ip"]' secrets/secrets.yaml 2>/dev/null)

  if [ -z "$MACHINE_IP" ]; then
    echo "Error: $MACHINE-ip not found in secrets/secrets.yaml"
    echo "Add it with: sops secrets/secrets.yaml"
    echo ""
    echo "Or use: $0 $MACHINE user@host"
    exit 1
  fi

  TARGET="$MACHINE_IP"
fi

echo "Deploying to $MACHINE ($TARGET) using deploy-rs (building on remote)..."
nix run github:serokell/deploy-rs -- \
  --remote-build \
  --skip-checks \
  --hostname "$TARGET" \
  .#$MACHINE
