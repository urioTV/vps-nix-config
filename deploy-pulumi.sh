#!/bin/bash
# Deploy infrastructure via Pulumi
set -e

cd "$(dirname "$0")/pulumi"

echo "🚀 Deploying infrastructure with Pulumi..."
echo ""

# Check if logged in to Pulumi
if ! pulumi whoami &>/dev/null; then
    echo "⚠️  Not logged in to Pulumi. Please run: pulumi login"
    exit 1
fi

# Select the vps-ovh stack (create if doesn't exist)
if ! pulumi stack select vps-ovh 2>/dev/null; then
    echo "📦 Creating vps-ovh stack..."
    pulumi stack init vps-ovh
fi

# Run Pulumi up
pulumi up

echo ""
echo "✅ Deployment complete!"
