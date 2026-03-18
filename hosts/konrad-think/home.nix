{
  config,
  pkgs,
  inputs,
  ...
}:

{
  imports = [ ../../home ];

  home.username = "urio";
  home.homeDirectory = "/home/urio";

  home.sessionVariables = {
    # EDITOR = "emacs";
  };
}
