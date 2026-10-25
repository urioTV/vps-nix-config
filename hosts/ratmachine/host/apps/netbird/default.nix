{ config, ... }:
{
  services.netbird = {
    enable = true;

    useRoutingFeatures = "none";

    clients.default = {
      # Keep the conventional service, CLI and interface names.
      name = "netbird";
      interface = "wt0";
      port = 51820;
      hardened = true;

      login = {
        enable = true;
        setupKeyFile = config.sops.secrets.netbird-authkey.path;
      };
    };
  };

  # IP forwarding for Kubernetes routing over the overlay (previously owned by
  # the removed Tailscale module; NetBird is the only overlay now).
  boot.kernel.sysctl = {
    "net.ipv4.ip_forward" = 1;
    "net.ipv6.conf.all.forwarding" = 1;
  };

  # Allow access to host and Kubernetes services through the NetBird overlay.
  networking.firewall.trustedInterfaces = [ "wt0" ];

  # Permit the administrative user to access the hardened daemon socket.
  users.users.urio.extraGroups = [ "netbird" ];
}
