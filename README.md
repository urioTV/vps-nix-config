# NixOS VPS Configuration

NixOS configuration for an OVH VPS with K3s Kubernetes cluster, managed via Pulumi.

## Architecture

```
├── configuration.nix          # Main NixOS config
├── flake.nix                  # Nix flake entry point
├── host/                      # Host-level NixOS modules
│   ├── apps/
│   │   ├── kubernetes/        # K3s server with Calico CNI
│   │   └── tailscale/         # Tailscale subnet router
│   ├── sops/                  # SOPS secrets (age-encrypted)
│   └── ...
├── home/                      # Home Manager configuration
├── pulumi/                    # Kubernetes infrastructure (Pulumi)
│   ├── cloudflare/            # Cloudflare Tunnels & Zero Trust
│   ├── kubernetes/            # K8s deployments & Helm releases
│   └── lib/                   # Shared utilities (SOPS loader)
├── secrets/                   # SOPS-encrypted secrets
└── scripts/                   # Helper scripts
```

## Stack

| Layer | Technology |
|-------|-----------|
| OS | NixOS (disko + nixos-anywhere) |
| Cluster | K3s (single-node) |
| CNI | Calico (VXLAN) |
| Storage | Longhorn |
| IaC | Pulumi (TypeScript) |
| Secrets | SOPS + age |
| Networking | Tailscale (subnet router) |
| Ingress | Cloudflare Tunnels + Zero Trust |

## Kubernetes Services

| Service | Namespace | Description |
|---------|-----------|-------------|
| AIOStreams | `aiostreams` | Stremio addon aggregator |
| AIOMetadata | `aiometadata` | Stremio metadata provider |
| Jackett | `jackett` | Torrent indexer proxy |
| Byparr | `byparr` | FlareSolverr alternative |
| MinIO | `minio` | S3-compatible object storage |
| Monitoring | `monitoring` | Prometheus + Grafana + Node Exporter |

## Prerequisites

- An OVH VPS accessible via SSH
- SOPS + age configured for secret management
- Tailscale account with auth key
- Cloudflare account with API token

## Deployment

### Initial NixOS Deployment

```bash
./deploy.sh
```

Uses `nixos-anywhere` to provision the VPS with NixOS, disko partitioning, and the full host configuration.

### NixOS Updates

```bash
./update.sh
```

Applies configuration changes via `nixos-rebuild switch` over SSH.

### Kubernetes Infrastructure

```bash
cd pulumi && pulumi up
```

Deploys all Kubernetes resources: namespaces, Helm charts, deployments, Cloudflare tunnels, and Zero Trust policies.

### Kubeconfig

```bash
./fetch-kubeconfig.sh
```

Fetches the K3s kubeconfig from the VPS via Tailscale.

## Secrets Management

Secrets are managed with SOPS (age-encrypted) in `secrets/secrets.yaml`. The VPS host decrypts secrets using its SSH host key. Pulumi reads secrets at deploy time via `pulumi/lib/sops.ts`.
