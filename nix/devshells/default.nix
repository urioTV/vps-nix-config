{ ... }:
{
  perSystem =
    {
      nixosDev,
      pulumiDev,
      toolsDev,
      ...
    }:
    let
      motd = profile: ''
        {202}vps-nix-config devshell{reset}
        Profile: ${profile}
        Project root: $PRJ_ROOT

        $(type -p menu &>/dev/null && menu)
      '';
    in
    {
      devshells.default = {
        devshell.name = "vps-nix-config";
        devshell.motd = motd "default = nixos + pulumi + tools";

        env = nixosDev.nixosEnv ++ pulumiDev.pulumiEnv ++ toolsDev.toolsEnv;
        packages =
          nixosDev.nixosPackages
          ++ pulumiDev.pulumiPackages
          ++ toolsDev.toolsPackages;
        commands =
          nixosDev.nixosCommands
          ++ pulumiDev.pulumiCommands
          ++ toolsDev.toolsCommands;

        devshell.startup.load-nixos-env.text = nixosDev.nixosStartup;
        devshell.startup.load-pulumi-env.text = pulumiDev.pulumiStartup;
        devshell.startup.load-tools-env.text = toolsDev.toolsStartup;
      };
    };
}
