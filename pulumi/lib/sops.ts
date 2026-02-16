import * as pulumi from "@pulumi/pulumi";
import { execSync } from "child_process";
import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";

/**
 * Interface for decrypted secrets from root secrets/secrets.yaml
 */
export interface SecretsConfig {
    // VPS Access
    "tailscale-authkey": string;
    "vps-ip": string;
    "vps-user": string;

    // Cloudflare
    cloudflare_api_token: string;
    cloudflare_account_id: string;
    cloudflare_zone_id: string;

    // AIOStreams
    aiostreams_domain: string;
    aiostreams_admin_email: string;
    aiostreams_secret_key: string;

    // MinIO
    minio_root_user: string;
    minio_root_password: string;

    // Jackett
    jackett_api_key: string;

    // Monitoring
    grafana_admin_password: string;
    grafana_domain: string;

    // OpenClaw
    openclaw_domain: string;
    openrouter_api_key: string;
    openclaw_gateway_token: string;

    // Perplexica
    perplexica_domain: string;
    perplexica_admin_email: string;
}

/**
 * Decrypt a SOPS-encrypted YAML file and return its contents
 */
export function decryptSopsFile<T = Record<string, unknown>>(filePath: string): T {
    const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(absolutePath)) {
        throw new Error(`SOPS file not found: ${absolutePath}`);
    }

    try {
        const decrypted = execSync(`sops -d "${absolutePath}"`, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        return yaml.load(decrypted) as T;
    } catch (error) {
        throw new Error(
            `Failed to decrypt SOPS file: ${absolutePath}. Make sure sops is installed and you have access to the age key.`
        );
    }
}

/**
 * Load secrets from the root secrets/secrets.yaml file
 */
export function loadSecrets(): SecretsConfig {
    // Path relative to pulumi directory
    const secretsPath = path.resolve(__dirname, "../../secrets/secrets.yaml");
    return decryptSopsFile<SecretsConfig>(secretsPath);
}

/**
 * Convert a secret value to a Pulumi Output for safe handling
 */
export function secretOutput(value: string): pulumi.Output<string> {
    return pulumi.secret(value);
}
