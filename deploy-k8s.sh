#!/bin/sh
# Deploy Kubernetes configurations and secrets

echo "🚀 Starting Kubernetes Deployment..."

# 1. Apply standard manifests (excluding encrypted secrets)
echo "📂 Applying standard manifests..."
find kubernetes -name "*.yaml" ! -name "*.enc.yaml" -print0 | xargs -0 kubectl apply -f

# 2. Decrypt and apply SOPS secrets
echo "🔐 Applying encrypted secrets..."
# Find YAML files in secrets/ that contain "sops" metadata
find secrets -name "*.yaml" -print0 | while IFS= read -r -d '' secret_file; do
  if grep -q "sops:" "$secret_file"; then
      echo "🔓 Decrypting and applying $secret_file..."
      if sops -d "$secret_file" | kubectl apply -f -; then
         echo "✅ Applied $secret_file"
      else
         echo "❌ Failed to apply $secret_file"
      fi
  else
      echo "⏩ Skipping $secret_file (not encrypted with SOPS)"
  fi
done

echo "🎉 Deployment Sync Complete!"
