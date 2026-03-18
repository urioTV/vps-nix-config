{
  config,
  pkgs,
  modulesPath,
  lib,
  ...
}:
{
  imports = [
    # Base installer ISO - provides installation tools (nixos-install, disko, etc.)
    "${modulesPath}/installer/cd-dvd/installation-cd-minimal.nix"
    # Channel for nixos-install
    "${modulesPath}/installer/cd-dvd/channel.nix"
  ];

  # Use LTS kernel (stable)
  boot.kernelPackages = pkgs.linuxPackages;

  # Realtek network drivers - needed for network during install
  boot.initrd.availableKernelModules = [
    "r8169" # Built-in Realtek driver
  ];

  # Load r8125 (better Realtek driver) if available
  boot.kernelModules = [ "r8169" ];
  boot.extraModulePackages = [ config.boot.kernelPackages.r8125 ];

  # Hostname for installer
  networking.hostName = "konrad-think-installer";

  # Enable SSH for remote installation
  services.openssh = {
    enable = true;
    settings = {
      PasswordAuthentication = false;
      PermitRootLogin = "yes";
    };
  };

  # Add your SSH keys
  users.users.root.openssh.authorizedKeys.keys = [
    "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCyC3ClITt+UIgaILLBg7cUFmFx61LyRWXjmVvsiVxWslYvmUdMtvkSPR46rJ/Ma9Yey2UabasvamQn2X+tKWOw0xC2WYxyfbN807AoXGjQ+l4DHjXK39gIhMOcFZLgvWFFz0s05yA7iiLqa1eC4JxggeVN0y7TLF3dGjZMs+5W3vhimy2y/oRL4TzJ1MMtcGc3RBo0YCYaczzVz42sd8mgbaVGf/5gXSGlXHptgLOVUYuEcistfqBzVQTns/wtlEngefqn/roAEuu+DUAUg1mSUG/vxEbZSkdOOp8DaltZEQoxWAPNWOlo5JuO+6hjOa60W0ZisSsYdXJPL83KzfMSW9DYUaW+vBHPO521NpFn36G8J8MB9otQq0LlqSdh7S6Oias/QuiFC6rgronDo7+J8+MJHb4uQ/F4xJ23//A0jG16aS+53OLoS4GBzIelKmNprxjAiDwyQbWrqL1vvBExgElZMgQsTf1ocvVAAZENizfZLaMVxpIHhW7kfjm1G6U= urio@Mac.lan"
  ];

  # Useful packages for installation
  environment.systemPackages = with pkgs; [
    # Disk partitioning
    disko
    parted
    gptfdisk
    # Network tools
    curl
    wget
    # Filesystem tools
    btrfs-progs
    xfsprogs
    dosfstools
    # Hardware info
    pciutils
    usbutils
    # Editor
    vim
    nano
  ];

  # Polish keyboard layout
  console.keyMap = "pl2";

  system.stateVersion = "24.11";
}
