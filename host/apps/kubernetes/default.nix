{ config, pkgs, ... }:
{
  services.k3s = {
    enable = true;
    role = "server";
    extraFlags = toString [
      # "--disable=traefik" # Wyłącz wbudowany traefik (opcjonalne)
      "--disable=local-storage" # Wyłącz wbudowany local-path
      "--tls-san=${config.networking.hostName}"
      "--flannel-backend=none"
      "--disable-network-policy" # Calico zajmie się politykami
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

  # Kubectl i helm w środowisku
  environment.systemPackages = with pkgs; [
    kubectl
    kubernetes-helm
    k3s
    openiscsi
    nfs-utils
    util-linux
    cryptsetup
  ];

  # Longhorn oczekuje binarek w standardowych ścieżkach, których NixOS nie używa domyślnie.
  systemd.tmpfiles.rules = [
    "L+ /usr/local/bin/iscsiadm - - - - ${pkgs.openiscsi}/bin/iscsiadm"
  ];

  boot.kernelModules = [
    "br_netfilter"
    "overlay"
  ];
  # 2. Firewall - Calico potrzebuje innych portów niż Flannel
  networking.firewall = {
    enable = true;
    trustedInterfaces = [
      "cali+"
      "tunl0"
      "tailscale0"
    ]; # Ufaj interfejsom Calico i Tailscale

    allowedTCPPorts = [
      179 # BGP (Calico) - kluczowe dla routingu
      # 80, 443 - Twoje Ingressy
    ];
    allowedUDPPorts = [
      4789 # VXLAN (jeśli Calico użyje trybu VXLAN)
      51820 # WireGuard (opcjonalnie, jeśli włączysz szyfrowanie w Calico)
    ];

    checkReversePath = "loose"; # Wymagane dla każdego CNI
  };

  # Port 6443 nie musi być otwierany globalnie
  # - tailscale0 jest już trusted w host/apps/tailscale/default.nix
  # - K8s API dostępne tylko przez Tailscale
}
