{
  inputs,
  config,
  pkgs,
  lib,
  ...
}:
{
  imports = [
    ./shells.nix
  ];

  programs = {
    git = {
      enable = true;
      settings = {
        user = {
          email = "uriootv@protonmail.com";
          name = "urioTV";
        };
      };
    };
    bat = {
      enable = true;
    };
  };
}
