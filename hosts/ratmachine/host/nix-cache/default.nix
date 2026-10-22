{ ... }:
{
  # Substituter for the kernel and packages published by the urio-nur CI
  # (cachix). Only ratmachine uses it; the shared nix-settings.nix stays as is.
  # List options merge across modules, so these entries are added to the defaults.
  nix.settings = {
    substituters = [ "https://uriotv.cachix.org" ];
    trusted-public-keys = [ "uriotv.cachix.org-1:goitmxx1/DXbyeFNubk9Dmp9nvg4V188Wvu4CdrRsyI=" ];
  };
}
