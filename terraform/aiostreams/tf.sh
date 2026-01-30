#!/usr/bin/env bash
set -e

# Change directory to the script's location
cd "$(dirname "$0")"

# Path to secrets relative to this script
SECRETS_FILE="../../secrets/minio-credentials.yaml"

if [ ! -f "$SECRETS_FILE" ]; then
    echo "❌ Error: Secrets file not found at $SECRETS_FILE"
    exit 1
fi

# Check if sops is installed
if ! command -v sops &> /dev/null; then
    echo "❌ Error: sops is not installed or not in PATH."
    exit 1
fi

# Decrypt credentials
# We use export so they are available to the terraform command
export AWS_ACCESS_KEY_ID=$(sops -d --extract '["stringData"]["MINIO_ROOT_USER"]' "$SECRETS_FILE")
export AWS_SECRET_ACCESS_KEY=$(sops -d --extract '["stringData"]["MINIO_ROOT_PASSWORD"]' "$SECRETS_FILE")

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ Failed to extract credentials from $SECRETS_FILE"
    exit 1
fi

# Handle Encrypted tfvars
TFVARS_ENC="terraform.tfvars.enc"
TFVARS_DEC="terraform.tfvars"

if [ -f "$TFVARS_ENC" ]; then
    echo "🔓 Decrypting $TFVARS_ENC to $TFVARS_DEC..."
    if sops -d "$TFVARS_ENC" > "$TFVARS_DEC"; then
        # Ensure we delete the decrypted file on exit (even if terraform fails)
        trap "rm -f '$TFVARS_DEC'" EXIT
    else
        echo "❌ Failed to decrypt $TFVARS_ENC"
        exit 1
    fi
elif [ -f "$TFVARS_DEC" ]; then
    echo "⚠️ Warning: Using existing unencrypted $TFVARS_DEC (No .enc file found)"
fi

# Run Terraform with passed arguments
exec terraform "$@"
