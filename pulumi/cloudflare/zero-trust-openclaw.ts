import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

export interface OpenclawZeroTrustConfig {
    accountId: string;
    domainName: string;
    adminEmail: string;
    provider: cloudflare.Provider;
}

export interface OpenclawZeroTrustOutputs {
    policyId: pulumi.Output<string>;
}

/**
 * Create Zero Trust Access policy and application for OpenClaw
 *
 * Security Model:
 * - Full domain protected by email authentication (admin only)
 */
export function createOpenclawZeroTrust(config: OpenclawZeroTrustConfig): OpenclawZeroTrustOutputs {
    const opts = { provider: config.provider };

    // Allow policy for admin email
    const policy = new cloudflare.ZeroTrustAccessPolicy("openclaw-policy", {
        accountId: config.accountId,
        name: "OpenClaw Access Policy",
        decision: "allow",
        includes: [
            {
                email: { email: config.adminEmail },
            },
        ],
    }, opts);

    // OpenClaw application - Protected
    new cloudflare.ZeroTrustAccessApplication("openclaw-app", {
        accountId: config.accountId,
        name: "OpenClaw (AI Assistant)",
        domain: config.domainName,
        type: "self_hosted",
        sessionDuration: "24h",
        policies: [{ id: policy.id }],
    }, opts);

    return {
        policyId: policy.id,
    };
}
