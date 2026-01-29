{ ... }:
{
  sops = {
    defaultSopsFile = ../../secrets/secrets.yaml;

    # Użyj klucza SSH hosta do deszyfrowania
    age.sshKeyPaths = [
      "/etc/ssh/ssh_host_ed25519_key"
    ];

    secrets = {
      tailscale-authkey = { };
    };
  };
}
