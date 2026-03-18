#!/usr/bin/env bash
# Deploy infrastructure via Pulumi
set -e

cd "$(dirname "$0")/../pulumi"

echo "🚀 Deploying infrastructure with Pulumi..."
echo ""

# Check if logged in to Pulumi
if ! pulumi whoami &>/dev/null; then
    echo "⚠️  Not logged in to Pulumi. Please run: pulumi login"
    exit 1
fi

# Select the urioTV/vps-ovh stack
pulumi stack select urioTV/vps-ovh

# Run Pulumi up
pulumi up

echo ""
echo "✅ Deployment complete!"
