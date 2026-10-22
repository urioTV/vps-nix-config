{ config, pkgs, ... }:
{
  # Ephemeral self-hosted runner for urioTV/urio-nur (public repository).
  #
  # Only trusted events reach it: the workflows that use these labels trigger on
  # push to main and workflow_dispatch, never on pull_request. The PAT is scoped
  # to this single repository. ephemeral = true gives every job a clean state.
  services.github-runners.urio-nur = {
    enable = true;
    url = "https://github.com/urioTV/urio-nur";
    name = "ratmachine-urio-nur";
    tokenFile = config.sops.secrets.github-runner-pat.path;
    ephemeral = true;
    # Replace a stale registration with the same name left by an earlier failed start.
    replace = true;
    extraLabels = [
      "nixos"
      "cachix-builder"
    ];
    extraPackages = [ pkgs.cachix ];
  };

  # Keep kernel builds from starving the k3s workloads on this host.
  # The runner executes workflow code from main, so it gets a restricted sandbox.
  # ProtectSystem=strict is left out: nix and the cachix/attic steps need writable paths.
  systemd.services.github-runner-urio-nur.serviceConfig = {
    NoNewPrivileges = true;
    PrivateTmp = true;
    ProtectHome = true;
    ProtectKernelTunables = true;
    ProtectKernelModules = true;
    ProtectKernelLogs = true;
    ProtectControlGroups = true;
    ProtectClock = true;
    RestrictSUIDSGID = true;
    RestrictRealtime = true;
    LockPersonality = true;
    MemoryHigh = "12G";
    MemoryMax = "16G";
    CPUQuota = "600%";
    Nice = 10;
  };
}
