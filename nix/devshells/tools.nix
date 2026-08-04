{ ... }:
{
  perSystem =
    { pkgs, ... }:
    let
      toolsPackages = with pkgs; [
        git
        jq
        opentofu
      ];

      toolsEnv = [ ];

      toolsStartup = ''
        if [ -z "''${TOOLS_DEVSHELL_INITIALIZED:-}" ]; then
          export TOOLS_DEVSHELL_INITIALIZED=1
        fi
      '';

      toolsCommands = [
        {
          name = "repo-check";
          category = "project";
          help = "Run flake, hive and Pulumi static checks";
          command = ''
            set -e
            cd "$PRJ_ROOT"
            nix flake check --no-build
            colmena eval -E '{ nodes, ... }: builtins.attrNames nodes'
            cd "$PRJ_ROOT/pulumi"
            bun run build
          '';
        }
      ];

      motd = profile: ''
        {202}vps-nix-config devshell{reset}
        Profile: ${profile}
        Project root: $PRJ_ROOT

        $(type -p menu &>/dev/null && menu)
      '';

      toolsDev = {
        inherit
          toolsPackages
          toolsCommands
          toolsStartup
          toolsEnv
          ;
      };
    in
    {
      _module.args = { inherit toolsDev; };

      devshells.tools = {
        devshell.name = "vps-nix-config-tools";
        devshell.motd = motd "tools";
        env = toolsEnv;
        packages = toolsPackages;
        commands = toolsCommands;
        devshell.startup.load-tools-env.text = toolsStartup;
      };
    };
}
