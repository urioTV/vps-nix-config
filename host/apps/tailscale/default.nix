{ config, ... }:
{
  services.tailscale = {
    enable = true;
    authKeyFile = config.sops.secrets.tailscale-authkey.path;
    useRoutingFeatures = "server";
    extraUpFlags = [
      "--ssh"
      "--accept-routes"
      "--advertise-exit-node"
    ];
    extraSetFlags = [
      "--advertise-routes=10.43.0.0/16"
    ];
  };

  # IP forwarding dla kubernetes
  boot.kernel.sysctl = {
    "net.ipv4.ip_forward" = 1;
    "net.ipv6.conf.all.forwarding" = 1;
  };

  # Firewall trust dla tailscale
  networking.firewall = {
    trustedInterfaces = [ "tailscale0" ];
    checkReversePath = "loose";
  };
}
