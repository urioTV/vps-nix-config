{ config, pkgs, ... }:
{
  services.k3s = {
    enable = true;
    role = "server";
    extraFlags = toString [
      # "--disable=traefik" # Wyłącz wbudowany traefik (opcjonalne)
      "--disable=local-storage" # Wyłącz wbudowany local-path
      "--tls-san=${config.networking.hostName}"
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

  # Port 6443 nie musi być otwierany globalnie
  # - tailscale0 jest już trusted w host/apps/tailscale/default.nix
  # - K8s API dostępne tylko przez Tailscale
}
