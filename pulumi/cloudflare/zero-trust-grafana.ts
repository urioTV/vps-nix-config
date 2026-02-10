import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

export interface GrafanaZeroTrustConfig {
    accountId: string;
    domainName: string;
    adminEmail: string;
    provider: cloudflare.Provider;
}

export interface GrafanaZeroTrustOutputs {
    policyId: pulumi.Output<string>;
}

/**
 * Create Zero Trust Access policy and application for Grafana
 *
 * Security Model:
 * - Full domain protected by email authentication (admin only)
 */
export function createGrafanaZeroTrust(config: GrafanaZeroTrustConfig): GrafanaZeroTrustOutputs {
    const opts = { provider: config.provider };

    // Allow policy for admin email
    const policy = new cloudflare.ZeroTrustAccessPolicy("grafana-policy", {
        accountId: config.accountId,
        name: "Grafana Access Policy",
        decision: "allow",
        includes: [
            {
                email: { email: config.adminEmail },
            },
        ],
    }, opts);

    // Grafana application - Protected
    new cloudflare.ZeroTrustAccessApplication("grafana-app", {
        accountId: config.accountId,
        name: "Grafana (Monitoring)",
        domain: config.domainName,
        type: "self_hosted",
        sessionDuration: "24h",
        policies: [{ id: policy.id }],
    }, opts);

    return {
        policyId: policy.id,
    };
}
