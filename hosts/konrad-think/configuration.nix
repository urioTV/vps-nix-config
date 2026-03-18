{
  modulesPath,
  config,
  pkgs,
  ...
}:
{
  imports = [
    (modulesPath + "/installer/scan/not-detected.nix")
    ./disk-config.nix
    ./host
  ];

  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;

  services.openssh = {
    enable = true;
    settings.PasswordAuthentication = false;
    settings.PermitRootLogin = "yes";
  };

  networking.hostName = "konrad-think";

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

  # USB modules for external drives
  boot.initrd.availableKernelModules = [
    "nvme"
    "xhci_pci"
    "ahci"
    "usbhid"
    "usb_storage"
    "uas"
    "sd_mod"
  ];
  boot.initrd.kernelModules = [ ];
  boot.kernelModules = [ "kvm-amd" ];

  # Data directories with user access
  systemd.tmpfiles.rules = [
    "d /data 0775 urio users - -"
  ];

  # USB drives - managed here (not in disko) because they're removable
  # Disko expects all disks to be present during install/rebuild
  fileSystems."/data/hdd" = {
    device = "/dev/disk/by-id/usb-SAMSUNG_HM500JI_123456789276-0:0-part1";
    fsType = "ext4";
    options = [
      "nofail"
      "noauto"
      "x-systemd.automount"
      "x-systemd.device-timeout=5"
      "x-systemd.idle-timeout=10min"
    ];
  };

  fileSystems."/data/ssd" = {
    device = "/dev/disk/by-id/usb-Samsung_Portable_SSD_T5_1234568079C7-0:0-part1";
    fsType = "ext4";
    options = [
      "nofail"
      "noauto"
      "x-systemd.automount"
      "x-systemd.device-timeout=5"
      "x-systemd.idle-timeout=10min"
    ];
  };

  console.keyMap = "pl2";
  time.timeZone = "Europe/Warsaw";
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
