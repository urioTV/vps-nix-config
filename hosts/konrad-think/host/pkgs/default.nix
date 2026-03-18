{ pkgs, ... }:
{
  imports = [ ];

  environment.systemPackages = with pkgs; [
    fastfetch
  ];
}
