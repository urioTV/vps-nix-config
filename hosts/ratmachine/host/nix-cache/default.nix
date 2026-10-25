{ ... }:
{
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
  };
}
