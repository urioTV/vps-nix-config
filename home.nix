{
  config,
  pkgs,
  inputs,
  ...
}:

{
  imports = [ ./home ];

  home.username = "urio";
  home.homeDirectory = "/home/urio";

  home.sessionVariables = {
    # EDITOR = "emacs";
  };

  # Let Home Manager install and manage itself.
  # programs.home-manager.enable = true;
}
