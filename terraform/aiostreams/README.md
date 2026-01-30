# AIOStreams Terraform Configuration

This directory contains the Terraform configuration for AIOStreams Cloudflare integration.

It manages:
- Cloudflare Tunnel (Tunnel ID, Token, Config)
- Cloudflare DNS Record
- Cloudflare Access Applications (Zero Trust policies)

## Usage

1.  Initialize Terraform:
    ```bash
    terraform init
    ```

2.  Configure Variables:
    Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in your details.
    ```bash
    cp terraform.tfvars.example terraform.tfvars
    nano terraform.tfvars
    ```

3.  Apply & Encrypt:
    ```bash
    ./sync-to-sops.sh
    ```
    This script will:
    - Apply Terraform configuration
    - Extract the tunnel token
    - Create an encrypted Kubernetes secret at `secrets/aiostreams-tunnel.yaml`

4.  Deploy Secret:
    ```bash
    sops -d ../../secrets/aiostreams-tunnel.yaml | kubectl apply -f -
    ```
