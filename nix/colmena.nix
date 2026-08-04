{ inputs, hosts }:
inputs.colmena.lib.makeHive {
  meta = {
    name = "vps-nix-config";
    description = "NixOS hosts managed by Colmena";
    nixpkgs = inputs.nixpkgs.legacyPackages.x86_64-linux;
    specialArgs = { inherit inputs; };

    # Every deployment must explicitly select nodes with --on.
    allowApplyAll = false;
  };

  defaults = {
    # Match lib.nixosSystem's flake metadata so Colmena and
    # nixosConfigurations produce the same system closure.
    system.nixos.revision = inputs.nixpkgs.rev;
    system.nixos.versionSuffix =
      ".${builtins.substring 0 8 inputs.nixpkgs.lastModifiedDate}.${builtins.substring 0 7 inputs.nixpkgs.rev}";

    deployment.sshOptions = [
      "-o"
      "ConnectTimeout=30"
      "-o"
      "ServerAliveInterval=15"
      "-o"
      "ServerAliveCountMax=4"
    ];
  };

  ratmachine = {
    imports = hosts.ratmachine.modules;
    deployment = hosts.ratmachine.deployment;
  };

  konrad-think = {
    imports = hosts.konrad-think.modules;
    deployment = hosts.konrad-think.deployment;
  };
}
