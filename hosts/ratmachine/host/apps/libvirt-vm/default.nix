{
  config,
  pkgs,
  lib,
  inputs,
  ...
}:
# Declarative libvirt VM running a plain Debian guest (see AGENTS.md).
#
# This VM is a disposable sandbox for Hermes Agent (Nous Research): a small
# Debian the user gives an agent full root access to, so the agent can do
# whatever it wants without touching the host. Only the virtual hardware is
# declared here; the guest is a stock Debian cloud image configured
# imperatively (apt, cloud-init), by explicit user decision.
#
# Layering:
#   /nix/store  immutable Debian cloud image (pinned by hash)
#   ${baseCopy}  read-only working copy on the host disk
#   ${overlayDisk}  copy-on-write overlay that the VM actually boots
let
  nixvirt = inputs.nixvirt;

  vmName = "hermes";
  # Stable UUIDs keep libvirt definitions idempotent across rebuilds.
  vmUuid = "ce7fdb61-70a1-4b59-8416-224e86c20295";
  networkUuid = "e1262c6b-8dc8-4f8c-9412-abe1520e33fc";
  # Explicit MAC so the DHCP reservation below is meaningful.
  vmMac = "52:54:00:1a:2b:3c";

  # Debian 13 (trixie) genericcloud, a dated build rather than "latest" so the
  # hash stays reproducible. Hash comes from that build's SHA512SUMS.
  imageBuild = "20260914-2601";
  baseImage = pkgs.fetchurl {
    url = "https://cloud.debian.org/images/cloud/trixie/${imageBuild}/debian-13-genericcloud-amd64-${imageBuild}.qcow2";
    hash = "sha512-leEQ3829DtioKnXtlXmAL5lQyr9RqBDcxjiOgbx3gYhxOHi58o1YOg6mAvv0izWZaumtN/WEFm2PvWSJ3ySPUw==";
  };

  diskDir = "/var/lib/libvirt/images";
  baseCopy = "${diskDir}/debian-13-genericcloud-amd64.qcow2";
  overlayDisk = "${diskDir}/${vmName}.qcow2";
  seedCopy = "${diskDir}/${vmName}-seed.iso";
  diskSize = "32G";

  vmAddress = "192.168.122.10";

  # The guest trusts the same keys as the host administrative user, for both
  # the admin user and root: the point of this VM is to hand an agent full
  # access, and root SSH (key-only) is the simplest way to do that.
  sshKeys = config.users.users.urio.openssh.authorizedKeys.keys;

  userData = pkgs.writeText "${vmName}-user-data" ''
    #cloud-config
    hostname: ${vmName}
    manage_etc_hosts: true
    disable_root: false
    ssh_pwauth: false
    package_update: true
    # The only prerequisites of the Hermes Agent installer on Linux
    # (https://hermes-agent.nousresearch.com); it provisions Python, Node.js,
    # ripgrep and ffmpeg itself.
    packages:
      - git
      - curl
      - xz-utils
      - ca-certificates
      - sudo
      - qemu-guest-agent
    users:
      - name: root
        ssh_authorized_keys:
    ${lib.concatMapStrings (key: "        - ${key}\n") sshKeys}
      - name: urio
        gecos: Konrad Lemański
        groups: [sudo]
        shell: /bin/bash
        sudo: ["ALL=(ALL) NOPASSWD:ALL"]
        ssh_authorized_keys:
    ${lib.concatMapStrings (key: "      - ${key}\n") sshKeys}
    runcmd:
      # Host keys interrupted by a hard shutdown leave zero-byte files behind.
      # cloud-init never regenerates existing files, so sshd then refuses to
      # start ("no hostkeys available"). Remove empties and rebuild them.
      - "find /etc/ssh -name 'ssh_host_*_key*' -size 0 -delete"
      - "ssh-keygen -A"
      # Guest agent lets the host resolve the guest IP (virsh domifaddr --source agent).
      # The Debian unit is static (udev-activated), so `enable` would fail; start it.
      - "systemctl start qemu-guest-agent || true"
  '';

  # The instance-id is derived from user-data so that changing the guest
  # configuration makes cloud-init reprocess it on the next boot. A constant
  # instance-id would silently do nothing.
  metaData = pkgs.writeText "${vmName}-meta-data" ''
    instance-id: ${vmName}-${builtins.substring 0 12 (builtins.hashString "sha256" (toString userData))}
    local-hostname: ${vmName}
  '';

  # cloud-init NoCloud seed, attached as a CD-ROM. The volume label must stay
  # "cidata" for cloud-init to pick it up.
  seedIso = pkgs.runCommand "${vmName}-seed.iso" { nativeBuildInputs = [ pkgs.xorriso ]; } ''
    mkdir -p seed
    cp ${userData} seed/user-data
    cp ${metaData} seed/meta-data
    xorriso -as mkisofs -quiet -output $out -volid cidata -joliet -rock seed/
  '';

  networkXml = nixvirt.lib.network.writeXML (
    nixvirt.lib.network.templates.bridge {
      name = "vm-net";
      uuid = networkUuid;
      bridge_name = "virbr0";
      subnet_byte = 122;
      dhcp_hosts = [
        {
          mac = vmMac;
          name = vmName;
          ip = vmAddress;
        }
      ];
    }
  );

  domainXml = nixvirt.lib.domain.writeXML (
    let
      base = nixvirt.lib.domain.templates.linux {
        name = vmName;
        uuid = vmUuid;
        vcpu = { count = 2; };
        memory = { count = 4; unit = "GiB"; };
        storage_vol = overlayDisk;
        install_vol = seedCopy;
        bridge_name = "virbr0";
        net_iface_mac = vmMac;
        virtio_video = false;
      };
    in
    base
    // {
      # The disk already holds a bootable Debian; the seed ISO is only a data
      # volume for cloud-init, so never boot from it.
      os = base.os // {
        boot = [ { dev = "hd"; } ];
      };
      devices = base.devices // {
        # Serial console for recovery when SSH is unreachable: `virsh console`.
        serial = {
          type = "pty";
          target = { port = 0; };
        };
        console = {
          type = "pty";
          target = {
            type = "serial";
            port = 0;
          };
        };
        # Headless appliance: drop the SPICE audio/USB-redirection devices.
        sound = null;
        audio = null;
        redirdev = null;
      };
    }
  );

  prepareDisk = pkgs.writeShellScript "${vmName}-prepare-disk" ''
    set -euo pipefail

    install -d -m 0755 ${diskDir}

    # Local working copy of the image: libvirt manages permissions on the whole
    # backing chain, which must not reach into the read-only Nix store.
    if [ ! -e ${baseCopy} ]; then
      cp --reflink=auto ${baseImage} ${baseCopy}.tmp
      chmod 0444 ${baseCopy}.tmp
      mv ${baseCopy}.tmp ${baseCopy}
    fi

    # Copy-on-write overlay, grown beyond the image's own virtual size.
    if [ ! -e ${overlayDisk} ]; then
      ${pkgs.qemu-utils}/bin/qemu-img create \
        -f qcow2 \
        -b ${baseCopy} \
        -F qcow2 \
        -o lazy_refcounts=on \
        ${overlayDisk} ${diskSize}
      chown qemu-libvirtd:qemu-libvirtd ${overlayDisk} || true
      chmod 0600 ${overlayDisk} || true
    fi

    # Same reason as the base image: keep the seed outside the Nix store so
    # libvirt can adjust its ownership. Refresh it when its content changes.
    if ! cmp -s ${seedIso} ${seedCopy}; then
      install -m 0644 ${seedIso} ${seedCopy}.tmp
      mv ${seedCopy}.tmp ${seedCopy}
    fi
  '';

  # NixVirt defines and starts objects, but on this host libvirtd does not bring
  # them back after a daemon restart or reboot (`net-list --autostart` stays
  # empty even though the flag is set). Rather than depend on that, an explicit
  # idempotent command plus a timer guarantee the VM is up and self-heals.
  ensureRunning = pkgs.writeShellScript "${vmName}-ensure-running" ''
    set -uo pipefail
    v=${pkgs.libvirt}/bin/virsh
    export PATH=${lib.makeBinPath [ pkgs.coreutils pkgs.gnugrep ]}:$PATH

    # `virsh net-list --name` and `virsh list --name` already default to active
    # and running objects respectively, so no state filter is needed. grep is
    # used instead of parsing human-readable output, where "Autostart: yes" is
    # printed even for an inactive network.
    if ! $v net-info ${vmName}-net >/dev/null 2>&1; then
      echo "network vm-net is not defined yet" >&2
      exit 0
    fi

    if ! $v net-list --name | grep -qx vm-net; then
      echo "starting network vm-net"
      $v net-start vm-net || true
    fi

    if ! $v list --name | grep -qx ${vmName}; then
      echo "starting domain ${vmName}"
      $v start ${vmName} || true
    fi
  '';
in
{
  imports = [ nixvirt.nixosModules.default ];

  virtualisation = {
    libvirt = {
      enable = true;
      verbose = false;
      connections."qemu:///system" = {
        networks = [
          {
            definition = networkXml;
            active = true;
          }
        ];
        domains = [
          {
            definition = domainXml;
            active = true;
            # Never restart on redefinition. NixVirt's change detection reports
            # a difference on every run for this domain, and its "restart" is a
            # hard power-off (virsh destroy), which corrupted guest files.
            # Apply hardware changes with a manual `virsh shutdown` + start.
            restart = false;
          }
        ];
      };
    };

    libvirtd = {
      # The VM is only reachable from the host and through jump hosts.
      allowedBridges = [ "virbr0" ];
    };
  };

  # The overlay disk must exist before NixVirt defines and starts the domain.
  systemd.services."${vmName}-disk" = {
    description = "Prepare the ${vmName} libvirt disk";
    wantedBy = [ "multi-user.target" ];
    before = [ "nixvirt.service" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      ExecStart = prepareDisk;
    };
  };

  systemd.services.nixvirt = {
    requires = [ "${vmName}-disk.service" ];
    after = [ "${vmName}-disk.service" ];
  };

  # Order after nixvirt, but never pull it in: nixvirt is a oneshot without
  # RemainAfterExit, so Requires= would re-run it on every timer tick and its
  # change detection hard-power-cycled the guest every two minutes.
  systemd.services."${vmName}-ensure" = {
    description = "Ensure the ${vmName} libvirt domain is running";
    wantedBy = [ "multi-user.target" ];
    requires = [ "libvirtd.service" ];
    after = [
      "libvirtd.service"
      "nixvirt.service"
    ];
    serviceConfig = {
      Type = "oneshot";
      ExecStart = ensureRunning;
    };
  };

  # Cheap watchdog: a crashed or stopped domain comes back within two minutes.
  systemd.timers."${vmName}-ensure" = {
    description = "Periodically ensure the ${vmName} domain is running";
    wantedBy = [ "timers.target" ];
    timerConfig = {
      OnBootSec = "2min";
      OnUnitActiveSec = "2min";
      AccuracySec = "15s";
    };
  };

  # Host-to-guest traffic must not be filtered by the host firewall.
  networking.firewall.trustedInterfaces = [ "virbr0" ];

  # Let the administrative user drive virsh without root.
  users.users.urio.extraGroups = [ "libvirtd" ];

  # Guest TAP device: `virsh console` and libvirt networking rely on it.
  boot.kernelModules = [ "tun" ];
}
