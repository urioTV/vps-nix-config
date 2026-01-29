{
  modulesPath,
  config,
  lib,
  pkgs,
  ...
}:
{
  imports = [
    (modulesPath + "/installer/scan/not-detected.nix")
    (modulesPath + "/profiles/qemu-guest.nix")
    ./disk-config.nix
    ./host
  ];

  boot.loader.grub = {
    device = "nodev";
    enable = true;
    efiSupport = true;
    efiInstallAsRemovable = true;
  };

  services.openssh = {
    enable = true;
    settings.PasswordAuthentication = false;
    settings.PermitRootLogin = "yes";
  };

  networking.hostName = "vps";
  networking.useDHCP = lib.mkDefault true;

  users.users.root.openssh.authorizedKeys.keys = [
    "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCyC3ClITt+UIgaILLBg7cUFmFx61LyRWXjmVvsiVxWslYvmUdMtvkSPR46rJ/Ma9Yey2UabasvamQn2X+tKWOw0xC2WYxyfbN807AoXGjQ+l4DHjXK39gIhMOcFZLgvWFFz0s05yA7iiLqa1eC4JxggeVN0y7TLF3dGjZMs+5W3vhimy2y/oRL4TzJ1MMtcGc3RBo0YCYaczzVz42sd8mgbaVGf/5gXSGlXHptgLOVUYuEcistfqBzVQTns/wtlEngefqn/roAEuu+DUAUg1mSUG/vxEbZSkdOOp8DaltZEQoxWAPNWOlo5JuO+6hjOa60W0ZisSsYdXJPL83KzfMSW9DYUaW+vBHPO521NpFn36G8J8MB9otQq0LlqSdh7S6Oias/QuiFC6rgronDo7+J8+MJHb4uQ/F4xJ23//A0jG16aS+53OLoS4GBzIelKmNprxjAiDwyQbWrqL1vvBExgElZMgQsTf1ocvVAAZENizfZLaMVxpIHhW7kfjm1G6U= urio@Mac.lan"
  ];
  users.users.urio.openssh.authorizedKeys.keys = [
    "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCyC3ClITt+UIgaILLBg7cUFmFx61LyRWXjmVvsiVxWslYvmUdMtvkSPR46rJ/Ma9Yey2UabasvamQn2X+tKWOw0xC2WYxyfbN807AoXGjQ+l4DHjXK39gIhMOcFZLgvWFFz0s05yA7iiLqa1eC4JxggeVN0y7TLF3dGjZMs+5W3vhimy2y/oRL4TzJ1MMtcGc3RBo0YCYaczzVz42sd8mgbaVGf/5gXSGlXHptgLOVUYuEcistfqBzVQTns/wtlEngefqn/roAEuu+DUAUg1mSUG/vxEbZSkdOOp8DaltZEQoxWAPNWOlo5JuO+6hjOa60W0ZisSsYdXJPL83KzfMSW9DYUaW+vBHPO521NpFn36G8J8MB9otQq0LlqSdh7S6Oias/QuiFC6rgronDo7+J8+MJHb4uQ/F4xJ23//A0jG16aS+53OLoS4GBzIelKmNprxjAiDwyQbWrqL1vvBExgElZMgQsTf1ocvVAAZENizfZLaMVxpIHhW7kfjm1G6U= urio@Mac.lan"
  ];

  users.users.urio = {
    isNormalUser = true;
    description = "Konrad Lemański";
    extraGroups = [
      "networkmanager"
      "wheel"
      "audio"
      "video"
      "docker"
      "render"
    ];
    shell = pkgs.zsh;
  };
  # Configure console keymap
  console.keyMap = "pl2";

  # Set your time zone.
  time.timeZone = "Europe/Warsaw";

  # Select internationalisation properties.
  i18n.defaultLocale = "pl_PL.UTF-8";

  i18n.extraLocaleSettings = {
    LC_ADDRESS = "pl_PL.UTF-8";
    LC_IDENTIFICATION = "pl_PL.UTF-8";
    LC_MEASUREMENT = "pl_PL.UTF-8";
    LC_MONETARY = "pl_PL.UTF-8";
    LC_NAME = "pl_PL.UTF-8";
    LC_NUMERIC = "pl_PL.UTF-8";
    LC_PAPER = "pl_PL.UTF-8";
    LC_TELEPHONE = "pl_PL.UTF-8";
    LC_TIME = "pl_PL.UTF-8";
  };

  system.stateVersion = "24.11";
}
