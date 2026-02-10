{ ... }:
{
  sops = {
    defaultSopsFile = ../../secrets/secrets.yaml;

    # Use host SSH key for decryption
    age.sshKeyPaths = [
      "/etc/ssh/ssh_host_ed25519_key"
    ];

    secrets = {
      tailscale-authkey = { };
    };
  };
}
