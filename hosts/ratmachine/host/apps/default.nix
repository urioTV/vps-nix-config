{ ... }:

{
  imports = [
    ./kubernetes
    # ./libvirt-vm # Temporarily disabled; keep the VM configuration for later.
    ./netbird
    ./tailscale
  ];
}
