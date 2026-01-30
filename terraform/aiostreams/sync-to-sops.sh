#!/bin/sh
# Helper script to apply Terraform and output the token
echo "Initializing Terraform..."
terraform init

echo "Applying Terraform..."
terraform apply -auto-approve

echo "Extracting Token..."
TOKEN=$(terraform output -raw cloudflared_tunnel_token)

if [ -z "$TOKEN" ]; then
  echo "Error: Failed to fetch token."
  exit 1
fi

echo "Syncing to SOPS..."
SECRET_FILE="../../secrets/aiostreams-tunnel.yaml"

# Create a temporary file for the secret
cat <<EOF > secret.tmp.yaml
apiVersion: v1
kind: Secret
metadata:
  name: aiostreams-tunnel
  namespace: aiostreams
stringData:
  token: "$TOKEN"
EOF

# Encrypt the file using SOPS
if sops --encrypt --filename-override "$SECRET_FILE" secret.tmp.yaml > "$SECRET_FILE"; then
  echo "✅ Secret encrypted to $SECRET_FILE"
  rm secret.tmp.yaml
else
  echo "❌ Encryption failed."
  rm secret.tmp.yaml
  exit 1
fi

echo "To apply, run:"
echo "sops -d secrets/aiostreams-tunnel.yaml | kubectl apply -f -"
