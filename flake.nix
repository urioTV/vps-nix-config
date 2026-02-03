{
  description = "NixOS VPS Configuration";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

    flake-parts.url = "github:hercules-ci/flake-parts";

    disko = {
      url = "github:nix-community/disko";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    sops-nix = {
      url = "github:Mic92/sops-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    # Determinate Nix - do NOT use nixpkgs.follows for cache hits
    determinate.url = "https://flakehub.com/f/DeterminateSystems/determinate/3";

    deploy-rs = {
      url = "github:serokell/deploy-rs";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        inputs.home-manager.flakeModules.home-manager
      ];

      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      flake = with inputs; {
        nixosConfigurations.ratmachine = nixpkgs.lib.nixosSystem {
          system = "x86_64-linux";
          modules = [
            determinate.nixosModules.default
            disko.nixosModules.disko
            home-manager.nixosModules.home-manager
            sops-nix.nixosModules.sops
            {
              home-manager.users.urio = {
                imports = [ ./home.nix ];
                home.stateVersion = "24.11";
              };
            }
            ./nix-settings.nix
            ./configuration.nix
            ./hardware-configuration.nix
          ];
        };

        # deploy-rs configuration
        deploy.nodes.ratmachine = {
          hostname = "ratmachine"; # Will be overridden by --hostname flag
          sshUser = "root";
          profiles.system = {
            user = "root";
            path = deploy-rs.lib.x86_64-linux.activate.nixos inputs.self.nixosConfigurations.ratmachine;
          };
        };

        # Deployment checks
        checks = builtins.mapAttrs (
          system: deployLib: deployLib.deployChecks inputs.self.deploy
        ) deploy-rs.lib;
      };

      perSystem =
        { pkgs, ... }:
        {
          devShells.default = pkgs.mkShell {
            name = "vps-nix-config";

            packages = with pkgs; [
              # Secrets management
              sops
              age
              ssh-to-age

              # NixOS deployment
              nixos-rebuild

              # Pulumi IaC
              pulumi
              pulumiPackages.pulumi-nodejs
              nodejs_22
              nodePackages.typescript
              bun

              # Kubernetes
              kubectl

              # Terraform (for migration)
              opentofu
            ];

            shellHook = ''
              echo ""
              echo "🚀 VPS NixOS Config Development Shell"
              echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
              echo ""
              echo "NixOS Commands:"
              echo "  ./deploy.sh  - Deploy fresh NixOS install to VPS"
              echo "  ./update.sh  - Update existing NixOS configuration"
              echo ""
              echo "Pulumi Commands:"
              echo "  cd pulumi && pulumi up      - Deploy infrastructure"
              echo "  cd pulumi && pulumi preview - Preview changes"
              echo ""
              echo "Tools: sops, age, pulumi, kubectl, nodejs, bun"
              echo ""
            '';
          };
        };
    };
}
