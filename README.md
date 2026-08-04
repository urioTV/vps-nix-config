# NixOS VPS Configuration

Declarative NixOS configuration for an OVH VPS and a local server. Colmena manages ongoing NixOS deployments, while Pulumi manages Kubernetes and Cloudflare resources.

## Architecture

```text
├── flake.nix                 # Flake inputs and public outputs
├── nix/
│   ├── hosts.nix             # Shared host inventory
│   └── colmena.nix           # Colmena hive and deployment policy
├── hosts/
│   ├── ratmachine/           # OVH VPS configuration
│   └── konrad-think/         # Local server and installer image
├── home/                     # Shared Home Manager configuration
├── pulumi/                   # Kubernetes and Cloudflare infrastructure
├── scripts/                  # Provisioning, deployment and health checks
└── secrets/                  # SOPS-encrypted configuration
```

| Responsibility | Tool |
|---|---|
| Initial host provisioning | nixos-anywhere + disko |
| Ongoing NixOS deployment | Colmena |
| Host secrets | sops-nix + age |
| User configuration | Home Manager |
| Kubernetes and Cloudflare | Pulumi |

The same module inventory in `nix/hosts.nix` is used by both `nixosConfigurations` and `colmenaHive`. This prevents the installation and operational configurations from drifting apart.

## Prerequisites

Enter the reproducible development shell:

```bash
nix develop
```

The shell provides Colmena, SOPS, age, Pulumi, Bun, kubectl and the NixOS deployment tools.

Local access requires:

- an age identity capable of decrypting `secrets/secrets.yaml`;
- an SSH private key authorized on the target host;
- Pulumi authentication for Kubernetes infrastructure operations.

The devshell defaults to `~/.ssh/id_rsa.bin`. Override it while entering the shell when needed:

```bash
SSH_KEY=~/.ssh/id_ed25519 nix develop
```

Target addresses remain encrypted in SOPS. The NixOS devshell materializes a mode-0600 SSH config under `$XDG_RUNTIME_DIR` (or `/tmp`), exports it as `SSH_CONFIG_FILE`, and maps the hive node names to their addresses and SSH identity. Colmena can therefore be used directly without repository wrappers.

## Safe NixOS deployment workflow

Every Colmena deployment must select a node explicitly because the hive sets `meta.allowApplyAll = false`. Nodes build on target; therefore `deployment.replaceUnknownProfiles = true` is intentional—remote build outputs do not exist in the operator's local Nix store and cannot be classified as locally known. The mandatory safety sequence is `dry-activate` → `test` → `switch`.

Colmena is the complete deployment interface. Run operations in this order:

```bash
colmena eval -E '{ nodes, ... }: builtins.attrNames nodes'
colmena build --on ratmachine
colmena apply dry-activate --on ratmachine
colmena apply test --on ratmachine
colmena exec --on ratmachine -- systemctl is-active sshd k3s
colmena exec --on ratmachine -- k3s kubectl get nodes
colmena apply switch --on ratmachine
```

Useful goals and commands:

- `colmena build --on <node>` builds on the selected target;
- `colmena apply dry-activate --on <node>` shows activation changes;
- `colmena apply test --on <node>` activates until reboot;
- `colmena apply switch --on <node>` activates permanently;
- `colmena apply --reboot --on <node>` sets the boot profile and reboots;
- `colmena exec --on <node> -- <command>` executes an administrative command;
- `colmena repl` opens a REPL with all evaluated node configurations.

### First migration from another deployment tool

The first deployment uses the same `build` → `dry-activate` → `test` → `switch` sequence. Colmena may report that the previous profile is unknown; this is expected for target-built closures and profiles created by deploy-rs or `nixos-rebuild`.

### Rollback

List generations and switch to a known-good one through the remote console or SSH:

```bash
colmena exec --on ratmachine -- \
  nix-env --profile /nix/var/nix/profiles/system --list-generations
```

For a direct rollback on the host:

```bash
sudo nixos-rebuild switch --rollback
```

## Initial installation

Initial provisioning is deliberately separate from ongoing deployment because it partitions disks:

```bash
nixos-install ratmachine ubuntu@host
```

This invokes nixos-anywhere with disko and `nixosConfigurations.<machine>`. Treat it as destructive.

## Kubernetes infrastructure

Fetch the K3s kubeconfig:

```bash
kubeconfig-fetch ratmachine
```

Install Pulumi project dependencies and preview changes:

```bash
pulumi-deps
cd pulumi
pulumi preview
```

Apply after reviewing the preview:

```bash
cd pulumi
pulumi up
```

Pulumi manages namespaces, Helm charts, workloads, Cloudflare tunnels and Zero Trust policies. NixOS and Colmena manage the host and K3s service itself.

## Secrets

Edit encrypted values with:

```bash
secrets-edit
```

The VPS decrypts host secrets using `/etc/ssh/ssh_host_ed25519_key` through sops-nix. Pulumi reads required values at runtime through `pulumi/lib/sops.ts`.

Colmena `deployment.keys` is intentionally not used, avoiding a second secret-delivery mechanism.

## Validation

Before opening or merging changes:

```bash
repo-check
```

Focused environments are also available:

```bash
nix develop .#nixos
nix develop .#pulumi
nix develop .#tools
nix develop .#ci
```

With direnv installed, `direnv allow` loads the default profile from `.envrc`.
