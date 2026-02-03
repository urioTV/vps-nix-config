#!/bin/bash
echo "Enforcing managed API Key..."
CONFIG_FILE="/config/Jackett/ServerConfig.json"
if [ -f "$CONFIG_FILE" ]; then
  sed -i 's/"APIKey": ".*"/"APIKey": "'"$JACKETT_API_KEY"'"/' "$CONFIG_FILE"
  echo "API Key updated in $CONFIG_FILE"
else
  echo "Config file not found, skipping API Key enforcement (first run handles it differently or file missing)"
fi
