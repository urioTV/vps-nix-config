{
  description = "NixOS Multi-Machine Configuration";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

    flake-parts.url = "github:hercules-ci/flake-parts";

    devshell = {
      url = "github:numtide/devshell";
      inputs.nixpkgs.follows = "nixpkgs";
    };

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

    colmena = {
      # Pinned by flake.lock. Current main provides direct pure flake evaluation.
      url = "github:nix-community/colmena";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        inputs.home-manager.flakeModules.home-manager
        inputs.devshell.flakeModule
        ./nix/devshells/nixos.nix
        ./nix/devshells/pulumi.nix
        ./nix/devshells/tools.nix
        ./nix/devshells/ci.nix
        ./nix/devshells/default.nix
      ];

      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      flake =
        let
          hosts = import ./nix/hosts.nix { inherit inputs; };
        in
        {
          # The same host module inventory drives both first installation and
          # ongoing Colmena deployments.
          nixosConfigurations = builtins.mapAttrs (
            _name: host:
            inputs.nixpkgs.lib.nixosSystem {
              inherit (host) system modules;
              specialArgs = { inherit inputs; };
            }
          ) hosts;

          colmenaHive = import ./nix/colmena.nix {
            inherit inputs hosts;
          };

          # === INSTALLER IMAGES (native NixOS 25.05 method) ===
          packages.x86_64-linux = {
            # Installer ISO with nixos-install, disko, etc.
            konrad-think-installer-iso =
              inputs.self.nixosConfigurations.konrad-think-installer.config.system.build.images.iso;
            # Kexec tarball for network boot
            konrad-think-kexec = inputs.self.nixosConfigurations.konrad-think.config.system.build.images.kexec;
          };
        };
    };
}
