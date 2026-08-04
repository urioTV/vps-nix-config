{ ... }:
{
  perSystem =
    {
      pkgs,
      nixosDev,
      pulumiDev,
      toolsDev,
      ...
    }:
    let
      # CI intentionally excludes deployment helpers, kubectl, age tooling and
      # OpenTofu. It only evaluates Nix and type-checks the Pulumi project.
      ciPackages = [
        pkgs.git
        nixosDev.colmenaCli
        pulumiDev.pulumiCli
        pkgs.nodejs_22
        pkgs.bun
      ];

      ciCommandNames = [
        "pulumi-typecheck"
        "repo-check"
      ];
      ciCommands = builtins.filter (
        command: builtins.elem command.name ciCommandNames
      ) (nixosDev.nixosCommands ++ pulumiDev.pulumiCommands ++ toolsDev.toolsCommands);

      motd = profile: ''
        {202}vps-nix-config devshell{reset}
        Profile: ${profile}
        Project root: $PRJ_ROOT

        $(type -p menu &>/dev/null && menu)
      '';
    in
    {
      devshells.ci = {
        devshell.name = "vps-nix-config-ci";
        devshell.motd = motd "ci (evaluation + TypeScript)";
        env = nixosDev.nixosEnv ++ pulumiDev.pulumiEnv;
        packages = ciPackages;
        commands = ciCommands;
        devshell.startup.load-nixos-env.text = nixosDev.nixosStartup;
        devshell.startup.load-pulumi-env.text = pulumiDev.pulumiStartup;
      };
    };
}
