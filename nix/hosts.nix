{ inputs }:
let
  commonModules = [
    inputs.determinate.nixosModules.default
    inputs.disko.nixosModules.disko
    inputs.home-manager.nixosModules.home-manager
    ../nix-settings.nix
  ];

  homeManagerModule = host: {
    home-manager.users.urio = {
      imports = [ ../hosts/${host}/home.nix ];
      home.stateVersion = "24.11";
    };
  };
in
{
  ratmachine = {
    system = "x86_64-linux";
    modules = commonModules ++ [
      inputs.sops-nix.nixosModules.sops
      (homeManagerModule "ratmachine")
      ../hosts/ratmachine/configuration.nix
      ../hosts/ratmachine/hardware-configuration.nix
    ];
    deployment = {
      targetHost = "ratmachine";
      targetUser = "root";
      buildOnTarget = true;
      # Target-built closures do not exist in the operator's local store, so
      # Colmena cannot classify the active profile as locally known.
      replaceUnknownProfiles = true;
      tags = [
        "production"
        "vps"
        "k3s"
      ];
    };
  };

  konrad-think = {
    system = "x86_64-linux";
    modules = commonModules ++ [
      (homeManagerModule "konrad-think")
      ../hosts/konrad-think/configuration.nix
      ../hosts/konrad-think/hardware-configuration.nix
    ];
    deployment = {
      targetHost = "konrad-think";
      targetUser = "root";
      buildOnTarget = true;
      # See ratmachine: this is required when buildOnTarget is enabled.
      replaceUnknownProfiles = true;
      tags = [
        "homelab"
        "local"
      ];
    };
  };

  konrad-think-installer = {
    system = "x86_64-linux";
    modules = [
      inputs.determinate.nixosModules.default
      inputs.disko.nixosModules.disko
      ../nix-settings.nix
      ../hosts/konrad-think/installer-iso.nix
    ];
  };
}
