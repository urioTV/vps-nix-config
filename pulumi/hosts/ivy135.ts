import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as ansible from "@pulumi/ansible";

// Dry run before a real apply:
//   pulumi config set ivy135:checkMode true --stack urioTV/vps-ovh
const config = new pulumi.Config("ivy135");
const checkMode = config.getBoolean("checkMode") ?? false;

const playbookFile = path.resolve(__dirname, "../../ansible/playbooks/netbird.yml");
const playbookSha256 = crypto.createHash("sha256").update(fs.readFileSync(playbookFile)).digest("hex");

/**
 * Apply the NetBird baseline to mikr.us ivy135 with ansible-playbook.
 *
 * The provider runs ansible-playbook on the machine executing `pulumi up`, so
 * that machine needs ansible and SSH access to root@ivy135.netbird.cloud.
 *
 * `replayable` only runs the playbook when the resource is created. A plain
 * update (for example a changed checkMode flag) does not run it, so the
 * resource is replaced whenever the playbook content or the run mode changes.
 * A replacement also replays the playbook, which is idempotent.
 */
export function deployIvy135Baseline() {
    return new ansible.Playbook("ivy135-netbird", {
        name: "ivy135",
        playbook: "../ansible/playbooks/netbird.yml",
        replayable: true,
        checkMode,
        diffMode: checkMode,
        extraVars: {
            ansible_host: "ivy135.netbird.cloud",
            ansible_user: "root",
            // Content hash: editing the playbook changes this value and replaces the resource.
            playbook_sha256: playbookSha256,
        },
    }, {
        replaceOnChanges: ["extraVars", "checkMode", "diffMode"],
    });
}
