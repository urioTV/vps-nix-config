{ pkgs, ... }:
let
  # Same per-package overrides as the workstations; a no-op for tools that are
  # not installed on this host.
  lixOverlay = final: prev: {
    nix-direnv = prev.nix-direnv.override { nix = final.lixPackageSets.lix_2_96.lix; };
    nix-index = prev.nix-index.override { nix = final.lixPackageSets.lix_2_96.lix; };
  };
in
{
  nixpkgs.overlays = [ lixOverlay ];

  # Lix instead of Determinate Nix / CppNix, mirroring the workstation setup
  # (per-package override pattern from https://lix.systems/add-to-config/).
  # The full upstream Lix overlay hits infinite recursion (lix#980), so only
  # Lix-consuming tools are overridden; nixd/nixt stay on CppNix (C++ ABI).
  nix.package = pkgs.lixPackageSets.lix_2_96.lix;

  # Substituter for the kernel and packages published by the urio-nur CI
  # (cachix). Only ratmachine uses it; the shared nix-settings.nix stays as is.
  # List options merge across modules, so these entries are added to the defaults.
  nix.settings = {
    substituters = [ "https://uriotv.cachix.org" ];
    trusted-public-keys = [ "uriotv.cachix.org-1:goitmxx1/DXbyeFNubk9Dmp9nvg4V188Wvu4CdrRsyI=" ];

    # urio is the remote-builder account for the workstations (nix.buildMachines
    # over ssh-ng). A remote builder must be a trusted user on the target host.
    # The workstations connect as urio instead of root, so builder access does
    # not hand out a root shell.
    trusted-users = [ "root" "urio" ];

    # Daemon-triggered auto-GC: when free space drops below min-free (e.g. while
    # a remote build is running), the daemon collects garbage until max-free is
    # available. Without this, a full disk fails the build instead of cleaning
    # up first. Bounds are well below harmonia-gc's ensureFree (40G), which
    # handles the scheduled nightly pass. Lix does not accept size suffixes
    # here, so plain byte values are used (20G / 45G).
    min-free = 21474836480;
    max-free = 48318382080;
  };

  # Weekly full-store dedup pass. auto-optimise-store only hardlinks files
  # written while it was on; this also dedups historical duplicates.
  nix.optimise = {
    automatic = true;
    dates = [ "Sun 02:30" ];
  };
}
