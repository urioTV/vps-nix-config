# NixOS VPS Configuration

This repository contains a NixOS configuration for an OVH VPS, utilizing `disko` for partitioning and `nixos-anywhere` for deployment.

## Prerequisites

- An OVH VPS (or similar) accessible via SSH.
- An SSH public key added to your OVH account / VPS for root access (or password access initially).
- `nixos-anywhere` installed or available via `nix run`.

## Configuration Checks

1.  **SSH Key**: Update `configuration.nix` with your actual SSH public key:
    ```nix
      users.users.root.openssh.authorizedKeys.keys = [
        "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIP..." 
      ];
    ```
    **WARNING**: If you do not do this, you will be locked out after deployment.

2.  **Disk Device**: Verify the disk device on your VPS. SSH into the VPS (in rescue mode or current OS) and run `lsblk`.
    - If it is `/dev/sda`, no changes are needed.
    - If it is `/dev/vda` or `/dev/nvme0n1`, update `disk-config.nix` accordingly.

## Deployment

To deploy this configuration to your VPS, use the following command. Replace `root@<your-vps-ip>` with your actual VPS user and IP.

```bash
nix run github:nix-community/nixos-anywhere -- --flake .#vps root@<your-vps-ip>
```

### Explanation
- `--flake .#vps`: Selects the `vps` configuration defined in `flake.nix`.
- `root@<your-vps-ip>`: The target host to deploy to.

## Post-Deployment
After the deployment finishes, the VPS will reboot into NixOS. You can then SSH into it using the key you configured:

```bash
ssh root@<your-vps-ip>
```
