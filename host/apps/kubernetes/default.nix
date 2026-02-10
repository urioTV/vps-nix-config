{ config, pkgs, ... }:
{
  services.k3s = {
    enable = true;
    role = "server";
    extraFlags = toString [
      # "--disable=traefik" # Disable built-in traefik (optional)
      "--disable=local-storage" # Disable built-in local-path
      "--tls-san=${config.networking.hostName}"
      "--flannel-backend=none"
      "--disable-network-policy" # Calico handles network policies
      "--cluster-cidr=10.42.0.0/16"
      "--service-cidr=10.43.0.0/16"
    ];
  };

  systemd.services.k3s = {
    wants = [
      "iscsid.service"
      "network-online.target"
    ];
    after = [
      "iscsid.service"
      "network-online.target"
    ];
  };

  services.openiscsi = {
    enable = true;
    name = "iqn.2016-04.com.open-iscsi:${config.networking.hostName}";
  };

  # Kubectl and helm in system environment
  environment.systemPackages = with pkgs; [
    kubectl
    kubernetes-helm
    k3s
    openiscsi
    nfs-utils
    util-linux
    cryptsetup
  ];

  # Longhorn expects binaries at standard paths that NixOS doesn't use by default.
  systemd.tmpfiles.rules = [
    "L+ /usr/local/bin/iscsiadm - - - - ${pkgs.openiscsi}/bin/iscsiadm"
  ];

  boot.kernelModules = [
    "br_netfilter"
    "overlay"
  ];
  # 2. Firewall - Calico requires different ports than Flannel
  networking.firewall = {
    enable = true;
    trustedInterfaces = [
      "cali+"
      "tunl0"
      "tailscale0"
    ]; # Trust Calico and Tailscale interfaces

    allowedTCPPorts = [
      # 179 # BGP (Calico) - critical for routing
      # 80, 443 - Ingresses
    ];
    allowedUDPPorts = [
      # 4789 # VXLAN (if Calico uses VXLAN mode)
      51820 # WireGuard (optional, if Calico encryption is enabled)
    ];

    checkReversePath = "loose"; # Required for any CNI
  };
  networking.nameservers = [
    "1.1.1.1"
    "8.8.8.8"
  ];

  # Port 6443 doesn't need to be opened globally
  # - tailscale0 is already trusted in host/apps/tailscale/default.nix
  # - K8s API is accessible only via Tailscale
}
