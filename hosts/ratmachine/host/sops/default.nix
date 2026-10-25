{ ... }:
{
  sops = {
    defaultSopsFile = ../../../../secrets/secrets.yaml;

    # Use host SSH key for decryption
    age.sshKeyPaths = [
      "/etc/ssh/ssh_host_ed25519_key"
    ];

    secrets = {
      netbird-authkey = { };
      github-runner-pat = { };
      # Private Nix binary-cache signing key for Harmonia (ed25519, PEM).
      harmonia-cache-key = { };
    };
  };
}
