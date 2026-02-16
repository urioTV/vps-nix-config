import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

export interface PerplexicaZeroTrustConfig {
    accountId: string;
    domainName: string;
    adminEmail: string;
    provider: cloudflare.Provider;
}

export function createPerplexicaZeroTrust(config: PerplexicaZeroTrustConfig) {
    const opts = { provider: config.provider };

    // Allow policy for admin email
    const policy = new cloudflare.ZeroTrustAccessPolicy("perplexica-policy", {
        accountId: config.accountId,
        name: "Perplexica Access Policy",
        decision: "allow",
        includes: [
            {
                email: { email: config.adminEmail },
            },
        ],
    }, opts);

    // Perplexica application
    new cloudflare.ZeroTrustAccessApplication("perplexica-app", {
        accountId: config.accountId,
        name: "Perplexica",
        domain: config.domainName,
        type: "self_hosted",
        sessionDuration: "24h",
        policies: [{ id: policy.id }],
    }, opts);
}
