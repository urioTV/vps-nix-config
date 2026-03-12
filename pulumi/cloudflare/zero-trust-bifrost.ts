import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

export interface BifrostZeroTrustConfig {
    accountId: string;
    domainName: string;
    adminEmail?: string;
    provider: cloudflare.Provider;
}

export function createBifrostZeroTrust(config: BifrostZeroTrustConfig) {
    const opts = { provider: config.provider };

    void pulumi.output(config.accountId);

    const includes = config.adminEmail
        ? [{ email: { email: config.adminEmail } }]
        : [{ everyone: {} }];

    const policy = new cloudflare.ZeroTrustAccessPolicy("bifrost-policy", {
        accountId: config.accountId,
        name: "Bifrost Access Policy",
        decision: "allow",
        includes,
    }, opts);

    new cloudflare.ZeroTrustAccessApplication("bifrost-app", {
        accountId: config.accountId,
        name: "Bifrost",
        domain: config.domainName,
        type: "self_hosted",
        sessionDuration: "24h",
        policies: [{ id: policy.id }],
    }, opts);
}
