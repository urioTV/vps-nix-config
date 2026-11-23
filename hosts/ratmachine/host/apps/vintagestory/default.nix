{ config, inputs, lib, pkgs, ... }:
{
  nixpkgs.overlays = [ inputs.vintagestory-nix.overlays.default ];
  imports = [ inputs.vintagestory-nix.nixosModules.default ];

  nixpkgs.config.allowUnfreePredicate = pkg: pkg.pname == "vintagestory";

  services.vintagestory = {
    # Keep the world and settings on disk while the server is paused.
    enable = false;
    package = pkgs.vintagestoryPackages.v1-22-7;
    openFirewall = true;
    port = 42420;
    maxClients = 8;
    dataPath = "vintagestory";
  };

  systemd.services.vintagestory = lib.mkIf config.services.vintagestory.enable {
    serviceConfig = {
      # Generous game resources with guaranteed headroom for K3s, Nix builds
      # and SSH. MemoryHigh throttles first; MemoryMax is the hard ceiling.
      MemoryHigh = "8G";
      MemoryMax = "12G";
      CPUQuota = "600%";
      CPUWeight = 200;
      IOWeight = 500;
      StateDirectoryMode = "0700";
      UMask = "0077";
      KillSignal = "SIGINT";
      TimeoutStopSec = "180s";
      NoNewPrivileges = true;
      PrivateTmp = true;
      ProtectSystem = "strict";
      ProtectHome = true;
      ReadWritePaths = [ "/var/lib/vintagestory" ];
    };
  };

  systemd.sockets.vintagestory = lib.mkIf config.services.vintagestory.enable {
    wantedBy = [ ];
    # Stopping the service also stops its FIFO listener, so console access
    # cannot socket-activate a deliberately stopped game.
    partOf = [ "vintagestory.service" ];
    socketConfig = {
      SocketMode = "0600";
      SocketUser = "root";
      SocketGroup = "root";
    };
  };
}
