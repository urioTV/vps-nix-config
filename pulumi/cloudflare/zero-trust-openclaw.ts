import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

export interface OpenclawZeroTrustConfig {
    accountId: string;
    domainName: string;
    adminEmail: string;
    provider: cloudflare.Provider;
}

export function createOpenclawZeroTrust(config: OpenclawZeroTrustConfig) {
    const opts = { provider: config.provider };

    // Allow policy for admin email
    const policy = new cloudflare.ZeroTrustAccessPolicy("openclaw-policy", {
        accountId: config.accountId,
        name: "Openclaw Access Policy",
        decision: "allow",
        includes: [
            {
                email: { email: config.adminEmail },
            },
        ],
    }, opts);

    // Openclaw application
    new cloudflare.ZeroTrustAccessApplication("openclaw-app", {
        accountId: config.accountId,
        name: "Openclaw",
        domain: config.domainName,
        type: "self_hosted",
        sessionDuration: "24h",
        policies: [{ id: policy.id }],
    }, opts);
}
