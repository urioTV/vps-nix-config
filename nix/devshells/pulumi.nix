{ ... }:
{
  perSystem =
    { pkgs, ... }:
    let
      # pulumi-bin includes every provider plugin. Extract only the CLI binary
      # so entering the development shell does not pull the full plugin set.
      pulumiCli = pkgs.stdenv.mkDerivation {
        pname = "pulumi-cli";
        inherit (pkgs.pulumi-bin) version;
        src = builtins.head pkgs.pulumi-bin.srcs;

        nativeBuildInputs = pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [
          pkgs.autoPatchelfHook
          pkgs.makeWrapper
        ];
        buildInputs = pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [
          pkgs.stdenv.cc.cc.libgcc
        ];

        installPhase = ''
          runHook preInstall
          install -D -t "$out/bin" ./*
          runHook postInstall
        '';

        postFixup = pkgs.lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
          wrapProgram "$out/bin/pulumi" \
            --set LD_LIBRARY_PATH "${pkgs.lib.getLib pkgs.stdenv.cc.cc}/lib"
        '';

        meta = pkgs.pulumi-bin.meta;
      };

      pulumiPackages = with pkgs; [
        # The upstream Pulumi archive already contains the Node.js language host.
        pulumiCli
        nodejs_22
        typescript
        bun
        kubectl
      ];

      pulumiEnv = [
        {
          name = "KUBECONFIG";
          eval = "$PRJ_ROOT/kubeconfig";
        }
        {
          name = "PULUMI_SKIP_UPDATE_CHECK";
          value = "true";
        }
      ];

      pulumiStartup = ''
        if [ -z "''${PULUMI_DEVSHELL_INITIALIZED:-}" ]; then
          export PULUMI_DEVSHELL_INITIALIZED=1

          if [ ! -d "$PRJ_ROOT/pulumi/node_modules" ]; then
            echo "Hint: run pulumi-deps to install Pulumi dependencies." >&2
          fi
        fi
      '';

      pulumiCommands = [
        {
          name = "pulumi-deps";
          category = "pulumi";
          help = "Install locked Pulumi project dependencies";
          command = ''
            cd "$PRJ_ROOT/pulumi" && bun install --frozen-lockfile "$@"
          '';
        }
        {
          name = "pulumi-typecheck";
          category = "pulumi";
          help = "Type-check the Pulumi TypeScript project";
          command = ''
            cd "$PRJ_ROOT/pulumi" && bun run build "$@"
          '';
        }
      ];

      motd = profile: ''
        {202}vps-nix-config devshell{reset}
        Profile: ${profile}
        Project root: $PRJ_ROOT

        $(type -p menu &>/dev/null && menu)
      '';

      pulumiDev = {
        inherit
          pulumiCli
          pulumiPackages
          pulumiCommands
          pulumiStartup
          pulumiEnv
          ;
      };
    in
    {
      _module.args = { inherit pulumiDev; };

      devshells.pulumi = {
        devshell.name = "vps-nix-config-pulumi";
        devshell.motd = motd "pulumi";
        env = pulumiEnv;
        packages = pulumiPackages;
        commands = pulumiCommands;
        devshell.startup.load-pulumi-env.text = pulumiStartup;
      };
    };
}
