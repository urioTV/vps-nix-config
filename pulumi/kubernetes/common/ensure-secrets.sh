#!/usr/bin/env bash
set -e

# Resolve repo root. Script is in pulumi/kubernetes/common
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
SECRETS_FILE="$REPO_ROOT/secrets/secrets.yaml"

# Check if yq is installed (optional, but good for robust checking)
# We will use grep for simplicity to avoid dependencies if possible, or sops -d

if [ ! -f "$SECRETS_FILE" ]; then
    echo "Error: $SECRETS_FILE not found!"
    exit 1
fi

echo "Checking for Jackett API Key in $SECRETS_FILE..."

# Check if key exists (decrypt and grep)
if sops -d "$SECRETS_FILE" | grep -q "jackett_api_key:"; then
    echo "✅ Jackett API Key already exists."
else
    echo "⚠️  Jackett API Key missing. Generating new one..."
    # Generate random 32-char hex string
    NEW_KEY=$(openssl rand -hex 16)
    
    # Use sops --set to inject it. 
    # Note: sops --set takes a key path. For root level keys, it's straightforward.
    # We explicitly treat the input as string.
    sops --set '["jackett_api_key"] "'"$NEW_KEY"'"' "$SECRETS_FILE"
    
    echo "✅ Generated and saved new Jackett API Key."
fi
