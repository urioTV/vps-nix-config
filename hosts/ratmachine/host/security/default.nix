{ ... }:
{
  # SSH is reached through NetBird (wt0 is a trusted interface). The OpenSSH
  # module would otherwise open port 22 on every interface, including the public IP.
  services.openssh = {
    openFirewall = false;
    settings = {
      MaxAuthTries = 3;
      LoginGraceTime = 30;
      X11Forwarding = false;
      AllowAgentForwarding = false;
    };
  };

  # Brute-force protection for any SSH attempt that does reach the host.
  services.fail2ban = {
    enable = true;
    maxretry = 5;
    bantime = "1h";
    bantime-increment.enable = true;
  };

  # Audit trail for the sensitive paths, so a future intrusion leaves evidence.
  security.auditd.enable = true;
  security.audit = {
    enable = true;
    rules = [
      "-w /etc/ssh/sshd_config -p wa -k sshd-config"
      "-w /root/.ssh/ -p wa -k root-ssh"
      "-w /home/urio/.ssh/ -p wa -k urio-ssh"
      "-w /etc/sudoers -p wa -k sudoers"
      "-w /etc/sudoers.d/ -p wa -k sudoers"
      # Commands run by interactive users (auid >= 1000).
      "-a always,exit -F arch=b64 -S execve -F auid>=1000 -F auid!=unset -k user-exec"
    ];
  };
}
