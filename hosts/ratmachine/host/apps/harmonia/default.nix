{
  config,
  lib,
  ...
}:
{
  # Private Nix binary cache (Harmonia), replacing the attic cache that ran in
  # Kubernetes. Harmonia serves the host's /nix/store directly: anything built
  # or copied onto this machine is automatically served, so the old "push"
  # step (attic push) is replaced by `nix copy --to ssh-ng://root@ratmachine`.

  services.harmonia-dev.cache.enable = true;
  services.harmonia-dev.cache.signKeyPaths = [
    config.sops.secrets.harmonia-cache-key.path
  ];
  services.harmonia-dev.cache.settings = {
    # 2 workers are plenty for a single-user VPS cache.
    workers = 2;
    # Serve below cache.nixos.org in priority so the official cache is preferred.
    priority = 50;
  };

  # Reachability: the port is deliberately NOT in networking.firewall
  # allowedTCPPorts, so the WAN side stays closed. The NetBird interface
  # (wt0) is a trusted interface, so the cache is only reachable through
  # the overlay at http://ratmachine.netbird.cloud:5000.

  # Garbage collection keeps the store in check (there is no per-cache storage
  # ceiling like the attic PVC anymore; the VPS disk is the limit). keepRecent
  # protects paths fetched by builds from the last day; deleteOlderThan also
  # prunes old system profile generations, same as nix-collect-garbage.
  services.harmonia-dev.gc = {
    enable = true;
    automatic = true;
    deleteOlderThan = "30d";
    # 40G free headroom on a 188G disk: below this, GC keeps deleting from the
    # oldest paths instead of stopping, so the store cannot fill the disk.
    ensureFree = "40G";
    keepRecent = "1d";
  };

  # nix-settings.nix enables nix.gc globally; harmonia-gc is the single
  # collector on this host (two scheduled GCs would fight over the store).
  nix.gc.automatic = lib.mkForce false;

  # Signing key (secret from sops; the systemd unit consumes it via
  # LoadCredential, so no extra permissions are needed).
  sops.secrets.harmonia-cache-key = { };

  # The gc unit reads the Nix database directly; give it a stable schedule
  # away from the nightly k3s/backup load.
  services.harmonia-dev.gc.dates = "04:00";
  services.harmonia-dev.gc.randomizedDelaySec = "15min";

  # Long-running GC should not starve the Kubernetes workloads.
  systemd.services.harmonia-gc.serviceConfig = lib.mkIf config.services.harmonia-dev.gc.automatic {
    CPUQuota = "100%";
    IOSchedulingClass = "idle";
    Nice = 15;
  };
}
