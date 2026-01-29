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
nix run github:nix-community/nixos-anywhere -- --generate-hardware-config nixos-generate-config ./hardware-configuration.nix --flake .#ratmachine root@<your-vps-ip>
```

### Explanation
- `--generate-hardware-config nixos-generate-config ./hardware-configuration.nix`: Generates the `hardware-configuration.nix` file on the VPS and saves it to your local directory.
- `--flake .#ratmachine`: Selects the `ratmachine` configuration defined in `flake.nix`.
- `root@<your-vps-ip>`: The target host to deploy to.

## Post-Deployment
After the deployment finishes, the VPS will reboot into NixOS. You can then SSH into it using the key you configured:

```bash
ssh root@<your-vps-ip>
```

## Updating the System

After the initial deployment, you should use `nixos-rebuild` to apply updates, not `nixos-anywhere`.

### 1. Make Changes
Edit your configuration files locally.

### 2. Update `hardware-configuration.nix` (One-time)
If you used the `--generate-hardware-config` flag during the first deployment, `nixos-anywhere` will have overwritten your local `hardware-configuration.nix` with the correct one from the VPS.
**You must commit this file to git:**
```bash
git add hardware-configuration.nix
git commit -m "Add generated hardware configuration"
```

### 3. Apply Changes
Run this command from your local machine to build and switch the configuration on the remote VPS:

```bash
nixos-rebuild switch --flake .#ratmachine --target-host root@<your-vps-ip>
```
*Note: You may need to use `--use-remote-sudo` if you are deploying as a non-root user.*

## Helper Scripts

For convenience, you can use the provided scripts.

1.  Copy `.env.example` to `.env` and edit it with your VPS IP:
    ```bash
    cp .env.example .env
    # Edit .env
    ```

2.  **Deploy** (First time):
    ```bash
    ./deploy.sh
    ```

3.  **Update** (Subsequent changes):
    ```bash
    ./update.sh
    ```
