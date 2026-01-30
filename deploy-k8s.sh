#!/bin/sh
# Deploy Kubernetes configurations and secrets

echo "🚀 Starting Kubernetes Deployment..."

# 1. Apply standard manifests (excluding encrypted secrets)
echo "📂 Applying standard manifests..."
if kubectl apply -R -f kubernetes/; then
  echo "✅ Standard manifests applied."
else
  echo "❌ Failed to apply standard manifests."
  exit 1
fi

# 2. Decrypt and apply SOPS secrets
echo "🔐 Applying encrypted secrets..."
# Find YAML files in secrets/ that contain "sops" metadata
find secrets -name "*.yaml" -print0 | while IFS= read -r -d '' secret_file; do
  # Check if it looks like a Kubernetes resource (has apiVersion or kind)
  # AND has sops metadata
  if grep -q "sops:" "$secret_file"; then
      if grep -qE "apiVersion:|kind:" "$secret_file"; then
          echo "🔓 Decrypting and applying $secret_file..."
          if sops -d "$secret_file" | kubectl apply -f -; then
             echo "✅ Applied $secret_file"
          else
             echo "❌ Failed to apply $secret_file"
          fi
      else
          echo "⏩ Skipping $secret_file (Encrypted but not a K8s manifest)"
      fi
  else
      echo "⏩ Skipping $secret_file (not encrypted with SOPS)"
  fi
done

echo "🎉 Deployment Sync Complete!"
