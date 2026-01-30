#!/usr/bin/env bash
set -e

# Load VPS_IP from sops encrypted secrets
if ! command -v sops &> /dev/null; then
  echo "Error: sops is not installed."
  exit 1
fi

VPS_IP=$(sops -d --extract '["vps-ip"]' secrets/secrets.yaml 2>/dev/null)

if [ -z "$VPS_IP" ]; then
  echo "Error: vps-ip not found in secrets/secrets.yaml"
  exit 1
fi

TARGET_USER="root" # Default user
KUBECONFIG_REMOTE="/etc/rancher/k3s/k3s.yaml"
KUBECONFIG_LOCAL="kubeconfig"

echo "Connecting to $TARGET_USER@$VPS_IP to fetch configuration..."

# 1. Get Remote Hostname
echo "🔍 Resolving Remote Hostname..."
REMOTE_HOST=$(ssh "$TARGET_USER@$VPS_IP" "hostname")

if [ -z "$REMOTE_HOST" ]; then
  echo "❌ Error: Could not determine remote hostname."
  exit 1
fi
echo "✅ Found Remote Hostname: $REMOTE_HOST"

# 2. Fetch config and replace IP with Hostname
echo "⬇️  Downloading kubeconfig..."
ssh "$TARGET_USER@$VPS_IP" "cat $KUBECONFIG_REMOTE" | \
  sed "s/127.0.0.1/$REMOTE_HOST/g" | \
  sed "s/localhost/$REMOTE_HOST/g" > "$KUBECONFIG_LOCAL"

chmod 600 "$KUBECONFIG_LOCAL"

echo "⚠️  NOTE: Ensure '$REMOTE_HOST' resolves to your VPS IP ($VPS_IP) locally."
echo "   If using Tailscale with MagicDNS, this should work automatically."
echo "   Otherwise, add it to your /etc/hosts."

echo "✅ Kubeconfig saved to: $(pwd)/$KUBECONFIG_LOCAL"
echo "To use it, run:"
echo "export KUBECONFIG=$(pwd)/$KUBECONFIG_LOCAL"
echo "kubectl get nodes"
