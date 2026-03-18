#!/usr/bin/env bash
set -e

# Usage:
#   ./fetch-kubeconfig.sh <machine>              - lookup <machine>-ip from secrets
#   ./fetch-kubeconfig.sh <machine> <user@host>  - use direct address
#   ./fetch-kubeconfig.sh <user@host>            - direct address (machine name derived or "default")

MACHINE="${1:-ratmachine}"
TARGET="${2:-}"

# If only one arg and it contains @, it's a direct address
if [[ "$MACHINE" == *"@"* && -z "$TARGET" ]]; then
  TARGET="$MACHINE"
  MACHINE="ratmachine"  # default machine name for flake
fi

# If TARGET not provided, lookup from secrets
if [ -z "$TARGET" ]; then
  if ! command -v sops &> /dev/null; then
    echo "Error: sops is not installed."
    exit 1
  fi

  MACHINE_IP=$(sops -d --extract '["'$MACHINE'-ip"]' secrets/secrets.yaml 2>/dev/null)

  if [ -z "$MACHINE_IP" ]; then
    echo "Error: $MACHINE-ip not found in secrets/secrets.yaml"
    echo ""
    echo "Or use: $0 user@host"
    exit 1
  fi

  TARGET="root@$MACHINE_IP"
fi

# Extract user and host from TARGET (format: user@host)
TARGET_USER="${TARGET%%@*}"
TARGET_HOST="${TARGET#*@}"

KUBECONFIG_REMOTE="/etc/rancher/k3s/k3s.yaml"
KUBECONFIG_LOCAL="kubeconfig"

echo "Connecting to $TARGET to fetch configuration..."

# 1. Get Remote Hostname
echo "🔍 Resolving Remote Hostname..."
REMOTE_HOST=$(ssh "$TARGET" "hostname")

if [ -z "$REMOTE_HOST" ]; then
  echo "❌ Error: Could not determine remote hostname."
  exit 1
fi
echo "✅ Found Remote Hostname: $REMOTE_HOST"

# 2. Fetch config and replace IP with Hostname
echo "⬇️  Downloading kubeconfig..."
ssh "$TARGET" "cat $KUBECONFIG_REMOTE" | \
  sed "s/127.0.0.1/$REMOTE_HOST/g" | \
  sed "s/localhost/$REMOTE_HOST/g" > "$KUBECONFIG_LOCAL"

chmod 600 "$KUBECONFIG_LOCAL"

echo "⚠️  NOTE: Ensure '$REMOTE_HOST' resolves to $TARGET_HOST locally."
echo "   If using Tailscale with MagicDNS, this should work automatically."
echo "   Otherwise, add it to your /etc/hosts."

echo "✅ Kubeconfig saved to: $(pwd)/$KUBECONFIG_LOCAL"
echo "To use it, run:"
echo "export KUBECONFIG=$(pwd)/$KUBECONFIG_LOCAL"
echo "kubectl get nodes"
