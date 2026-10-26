# Vintage Story server on ratmachine

## Architecture

`ratmachine` runs one native NixOS Vintage Story dedicated server using the [PierreBorine/vintagestory-nix](https://codeberg.org/PierreBorine/vintagestory-nix) flake module. Its flake input follows this repository's `nixpkgs`; `flake.lock` pins the source revision. The ratmachine-only app module adds the upstream overlay and selects the explicitly pinned **1.22.7** package (`v1-22-7` in the selected flake's package set). The existing flake pin already contains this version, so no unrelated dependency update is needed. The package is proprietary/unfree; the narrow NixOS allowlist applies only to the Vintage Story package. The selected package currently evaluates with the nixpkgs-provided .NET runtime and requires no insecure-package exception.

The upstream module creates the `vintagestory` system user/group, a systemd service, an admin FIFO at `/run/vintagestory.socket`, and the `vintagestory-admin` console utility. The service keeps ordinary server data under `/var/lib/vintagestory` (`dataPath = "vintagestory"`), including saves, mods and writable `ModConfig`. Do not treat these files as Nix-managed or immutable. The server is configured for 8 concurrent clients, preserving the prior plan's slot count. Options passed by the module (such as port and maximum clients) take precedence over edits to the corresponding JSON settings; change those values in the Nix module. Other server and mod settings remain ordinary writable files.

The runtime game configuration has only two roles: `suplayer` (ordinary survival player and default role) and `admin` (administrator). These are manually managed in `serverconfig.json`, not recreated by Nix. Preserve their complete definitions when editing; `DefaultRoleCode` must reference an existing role.

The FIFO is root-owned, mode `0600`. Use `sudo vintagestory-admin` from a trusted local terminal or SSH session. Do not grant broad sudo privileges or expose the FIFO/admin interface through a network service. The app module scopes the Vintage Story overlay and options to ratmachine only; there is no WWW panel.

Resource limits leave guaranteed headroom for K3s, Nix builds and SSH: the game is throttled above 8 GiB of memory, hard-capped at 12 GiB, may use at most 600% CPU (six of eight cores), and has elevated CPU/IO weight. `MemoryMax` termination follows the upstream `Restart=on-failure` policy. Adjust these values in the Nix module, not at runtime. The service uses SIGINT for shutdown with a 180-second stop timeout so the game can save before exit. The FIFO socket is tied to the service lifecycle (`PartOf`) so a normal stop also stops the listener; a console connection cannot wake a deliberately stopped service. The upstream unit's `Sockets=` relationship starts the listener when the service starts. The upstream `Restart=on-failure` behavior remains in place; a deliberate systemd stop suppresses service restart. The unit has private temporary storage, protected system/home paths, and write access only to its state directory; mods may need additional access for unusual native integrations, so test any such mod before relaxing hardening.

## Public game access

The only public service port opened by this configuration is **42420/TCP and 42420/UDP**, the Vintage Story game port. The native firewall option opens both protocols. There are no SSH firewall changes and no admin port. Confirm any provider-level firewall/security-group rules also permit inbound TCP and UDP 42420.

Players connect to **`vintage.urio.dev:42420`**. The `vintage` A record is managed by Pulumi as DNS-only (grey cloud): the Cloudflare HTTP proxy cannot forward the game protocol, so the public IP stays visible. The record definition is `pulumi/cloudflare/vintagestory-dns.ts`. If a `vintage` record already exists in the Cloudflare dashboard, import it before `pulumi up` (`pulumi import cloudflare:index/dnsRecord:DnsRecord vintagestory-dns <zone_id>/<record_id>`); do not hand-edit it afterwards. Never publish the admin FIFO or create an HTTP administration endpoint.

## Manual game configuration and password

Nix manages the installation, systemd service and firewall, not the contents of `serverconfig.json`. There is no password bootstrap, credential injection or automatic rewriting of game settings. The game creates its own complete default configuration, including the `Roles` definitions required by `DefaultRoleCode`.

**Do not start the public server with an empty password.** For initial setup, use the packaged `vintagestory-server --dataPath /var/lib/vintagestory --genconfig` as the `vintagestory` user while the service is stopped. This generates defaults and exits without starting the game listener. It overwrites an existing configuration: first save a private backup, and never point it at an established configuration without reviewing that overwrite. Run the exact server executable selected by the Nix module, not an unrelated downloaded binary.

Edit the generated `/var/lib/vintagestory/serverconfig.json` and set its `Password` field before starting the service. Keep ownership `vintagestory:vintagestory` and permissions `0600`. The state directory remains private (`0700`). The configuration and its backups contain plaintext secrets; do not paste them into logs or commit them.

For later changes through the already-running admin console:

```text
/serverconfig password YOUR_PASSWORD
/autosavenow
```

Use a password without spaces. The console may retain command history in its privileged user's state directory; offline editing avoids placing a password in console history. Give the password only to invited players and verify rejection of a connection without it. A password restricts joining, not port scans or denial-of-service traffic; keep account authentication and whitelist protections enabled.

The previously chosen encrypted `vintagestory-password` value is retained in `secrets/secrets.yaml` so it is not lost, but the service no longer reads or enforces it. Changing it through `secrets-edit` no longer changes the game's password.

### Repairing the earlier incomplete configuration

The removed bootstrap wrote a minimal JSON without the required default `Roles`, causing the `default group code suplayer` startup error. Removing the bootstrap does **not** repair that existing runtime file. After applying the updated NixOS configuration, keep the game stopped, save a private backup of `serverconfig.json`, generate full defaults with `--genconfig`, then restore your desired settings and password manually before starting. Do not delete `Saves/`, `Mods/` or `ModConfig/`.

## Administration

From the workstation, enter the repository devshell and connect using its generated private SSH configuration:

```sh
nix develop .#nixos
ssh -F "$SSH_CONFIG_FILE" -t ratmachine
```

The generated SSH configuration logs in as root. Commands below use `sudo` so they also work from a separately configured privileged user account. For interactive administration keep the SSH terminal open; Ctrl-D exits SSH.

Use the upstream console utility:

```sh
sudo vintagestory-admin
```

It follows the service journal and sends entered commands to the server console. Enter `/help` to inspect commands supported by the installed game version; for example, `/op <playername>` grants operator status. Consult the [Vintage Story server command documentation](https://wiki.vintagestory.at/Server_Commands) and verify command spelling/permissions with `/help` before using administrative commands. Ctrl-C exits the console client; it does not stop the service. The FIFO is privileged root-only even though the game itself runs unprivileged as `vintagestory`.

Stop/start the game explicitly through systemd:

```sh
sudo systemctl stop vintagestory.service
sudo systemctl start vintagestory.service
sudo systemctl restart vintagestory.service
sudo systemctl status vintagestory.service
sudo journalctl -u vintagestory.service -n 150 --no-pager
```

A clean `stop` also stops `vintagestory.socket`. Starting the service brings up its FIFO socket as needed. Check both units if diagnosing an unexpected console connection:

```sh
sudo systemctl status vintagestory.service vintagestory.socket
```

### Mods and configuration

1. Stop the service and wait until systemd reports it inactive; check logs for completed save/shutdown.
2. Upload intact mod archives into `/var/lib/vintagestory/Mods/` (create the directory if needed) and use the `vintagestory` ownership. Do not unpack mods unless their documentation specifically requires it.
3. Edit the relevant server configuration or `/var/lib/vintagestory/ModConfig/` files as appropriate. Keep normal ownership and write access for the service account.
4. Start the service and inspect its journal for mod loading errors.

For example, from a workstation with SSH access, stop first, transfer a mod, and start again:

```sh
ssh -F "$SSH_CONFIG_FILE" ratmachine 'sudo systemctl stop vintagestory.service'
scp -F "$SSH_CONFIG_FILE" ./ExampleMod.zip ratmachine:/tmp/ExampleMod.zip
ssh -F "$SSH_CONFIG_FILE" ratmachine 'sudo install -d -o vintagestory -g vintagestory -m 0700 /var/lib/vintagestory/Mods && sudo install -o vintagestory -g vintagestory -m 0644 /tmp/ExampleMod.zip /var/lib/vintagestory/Mods/ExampleMod.zip && rm /tmp/ExampleMod.zip && sudo systemctl start vintagestory.service'
```

Adapt the SSH host alias and local file path to your setup. Do not edit mod files while the server is running. Check each mod's supported game version and dependencies before installation.

## Validation and activation

Deployments are executed by the assistant only on explicit user request; keep the documented validation stages (`build` → `dry-activate` → `test` → verification → `switch`) in that order. The current deployment is active and verified; this section describes the established procedure for future changes. From the repository root, use the documented ratmachine-only Colmena sequence (run each stage yourself and stop if a check fails):

```sh
colmena eval -E '{ nodes, ... }: builtins.attrNames nodes'
colmena build --on ratmachine
colmena apply dry-activate --on ratmachine
colmena apply test --on ratmachine
colmena exec --on ratmachine -- systemctl is-active sshd k3s
colmena exec --on ratmachine -- k3s kubectl get nodes
colmena exec --on ratmachine -- systemctl is-active vintagestory.service vintagestory.socket
# Verify game login, saving and the public connection before making it permanent.
colmena apply switch --on ratmachine
```

After activation, check the service and listener, review startup logs, and test a client connection from outside the host's private network:

```sh
ssh -F "$SSH_CONFIG_FILE" ratmachine 'sudo systemctl is-active vintagestory.service vintagestory.socket'
ssh -F "$SSH_CONFIG_FILE" ratmachine 'sudo journalctl -u vintagestory.service -n 150 --no-pager'
```

Verify TCP and UDP reachability on port 42420 from an external network and verify no administrative endpoint is reachable publicly. Also test `sudo systemctl stop vintagestory.service`, ensure both units become inactive, and confirm the server remains stopped until explicitly started. Do not open the admin console while stopped: its FIFO writer may wait for a listener; cancel it with Ctrl-C rather than starting another process. Check that shutdown completes within 180 seconds and that save files persist.

Local evaluation/build is not a substitute for a live test of game login, saving, public firewall rules or mod compatibility. System activation is performed by the operator, not automatically by the assistant.

## Backups

No backup destination or automated backup policy is configured here. `/var/lib/vintagestory` contains the complete world and mod/configuration data; losing it may be irreversible. Before inviting players, arrange a secure off-host backup and test a restore. Stop the server for a consistent copy, then copy the entire data directory to a protected destination. Backups may include sensitive game configuration; do not commit them or place them in a public location.
