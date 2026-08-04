{ ... }:
{
  perSystem =
    {
      inputs',
      pkgs,
      ...
    }:
    let
      colmenaCli = inputs'.colmena.packages.colmena;

      nixosPackages = with pkgs; [
        colmenaCli
        nixos-rebuild
        sops
        age
        ssh-to-age
      ];

      nixosEnv = [ ];

      # Colmena consumes SSH_CONFIG_FILE itself. Materialize a private runtime
      # config so the hive can stay pure while target addresses remain in SOPS.
      nixosStartup = ''
        if [ -z "''${NIXOS_DEVSHELL_INITIALIZED:-}" ]; then
          export NIXOS_DEVSHELL_INITIALIZED=1

          runtime_base="''${XDG_RUNTIME_DIR:-/tmp}"
          runtime_dir="$runtime_base/vps-nix-config-''${UID:-$(id -u)}"
          ssh_config="$runtime_dir/ssh_config"
          ssh_key="''${SSH_KEY:-$HOME/.ssh/id_rsa.bin}"

          mkdir -p "$runtime_dir"
          chmod 700 "$runtime_dir"
          : > "$ssh_config"
          chmod 600 "$ssh_config"
          export SSH_CONFIG_FILE="$ssh_config"

          if [ ! -r "$ssh_key" ]; then
            echo "Warning: SSH key is not readable: $ssh_key" >&2
            echo "Set SSH_KEY before entering the shell to enable Colmena access." >&2
          elif ! sops -d "$PRJ_ROOT/secrets/secrets.yaml" >/dev/null 2>&1; then
            echo "Warning: SOPS secrets cannot be decrypted; Colmena SSH targets are unavailable." >&2
          else
            for machine in ratmachine konrad-think; do
              ip=$(sops -d --extract "[\"$machine-ip\"]" \
                "$PRJ_ROOT/secrets/secrets.yaml" 2>/dev/null || true)
              [ -n "$ip" ] || continue

              cat >> "$ssh_config" <<EOF
Host $machine
  HostName $ip
  User root
  IdentityFile "$ssh_key"
  IdentitiesOnly yes
  ConnectTimeout 30
  ServerAliveInterval 15
  ServerAliveCountMax 4

EOF
            done
          fi
        fi
      '';

      # Colmena itself is the deployment interface. These commands only cover
      # repository-specific workflows that upstream CLIs do not provide.
      nixosCommands = [
        {
          name = "nixos-install";
          category = "nixos";
          help = "DESTRUCTIVE: provision a host with nixos-anywhere";
          command = ''
            "$PRJ_ROOT/scripts/deploy.sh" "$@"
          '';
        }
        {
          name = "kubeconfig-fetch";
          category = "nixos";
          help = "Fetch the K3s kubeconfig from a host";
          command = ''
            "$PRJ_ROOT/scripts/fetch-kubeconfig.sh" "$@"
          '';
        }
        {
          name = "secrets-edit";
          category = "secrets";
          help = "Edit the SOPS-encrypted secrets file";
          command = ''
            sops "$PRJ_ROOT/secrets/secrets.yaml"
          '';
        }
      ];

      motd = profile: ''
        {202}vps-nix-config devshell{reset}
        Profile: ${profile}
        Project root: $PRJ_ROOT

        Colmena examples:
          colmena build --on ratmachine
          colmena apply dry-activate --on ratmachine
          colmena apply test --on ratmachine
          colmena apply switch --on ratmachine

        $(type -p menu &>/dev/null && menu)
      '';

      nixosDev = {
        inherit
          colmenaCli
          nixosPackages
          nixosCommands
          nixosStartup
          nixosEnv
          ;
      };
    in
    {
      _module.args = { inherit nixosDev; };

      devshells.nixos = {
        devshell.name = "vps-nix-config-nixos";
        devshell.motd = motd "nixos";
        env = nixosEnv;
        packages = nixosPackages;
        commands = nixosCommands;
        devshell.startup.load-nixos-env.text = nixosStartup;
      };
    };
}
