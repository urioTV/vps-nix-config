{
  description = "NixOS VPS Configuration";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    disko.url = "github:nix-community/disko";
    disko.inputs.nixpkgs.follows = "nixpkgs";
    home-manager.url = "github:nix-community/home-manager";
    home-manager.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      self,
      nixpkgs,
      disko,
      home-manager,
      ...
    }@inputs:
    {
      nixosConfigurations.ratmachine = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          disko.nixosModules.disko
          home-manager.nixosModules.home-manager
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
    };
}
