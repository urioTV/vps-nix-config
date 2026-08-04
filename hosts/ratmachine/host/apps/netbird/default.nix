{ config, ... }:
{
  services.netbird = {
    enable = true;

    # Tailscale's server mode already enables the same global IP forwarding.
    # Keep a single owner while both overlays run side by side.
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

  # Allow access to host and Kubernetes services through the NetBird overlay.
  networking.firewall.trustedInterfaces = [ "wt0" ];

  # Permit the administrative user to access the hardened daemon socket.
  users.users.urio.extraGroups = [ "netbird" ];
}
