import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

export interface AiostreamsZeroTrustConfig {
    accountId: string;
    domainName: string;
    adminEmail: string;
    provider: cloudflare.Provider;
}

export interface AiostreamsZeroTrustOutputs {
    bypassPolicyId: pulumi.Output<string>;
    adminPolicyId: pulumi.Output<string>;
}

/**
 * Create Zero Trust Access policies and applications for AIOStreams
 * 
 * Security Model:
 * - /stremio/configure → Protected by email authentication
 * - Stremio API paths → Publicly accessible (bypass)
 */
export function createAiostreamsZeroTrust(config: AiostreamsZeroTrustConfig): AiostreamsZeroTrustOutputs {
    const opts = { provider: config.provider };

    // --- Access Policies ---

    // Bypass policy for public Stremio API paths
    const bypassPolicy = new cloudflare.ZeroTrustAccessPolicy("stremio-api-bypass", {
        accountId: config.accountId,
        name: "Stremio API Public Access",
        decision: "bypass",
        includes: [
            {
                everyone: {},
            },
        ],
    }, opts);

    // Allow policy for admin email
    const adminPolicy = new cloudflare.ZeroTrustAccessPolicy("admin-allow", {
        accountId: config.accountId,
        name: "Admin Email Access",
        decision: "allow",
        includes: [
            {
                email: { email: config.adminEmail },
            },
        ],
    }, opts);

    // --- Access Applications (Public/Bypass) ---

    // Manifest endpoint - Public
    new cloudflare.ZeroTrustAccessApplication("stremio-manifest", {
        accountId: config.accountId,
        name: "AIOStreams - Manifest (Public)",
        type: "self_hosted",
        sessionDuration: "24h",
        destinations: [
            { uri: `${config.domainName}/manifest.json` },
            { uri: `${config.domainName}/*/manifest.json` },
        ],
        policies: [
            { id: bypassPolicy.id },
        ],
    }, opts);

    // Catalog endpoint - Public
    new cloudflare.ZeroTrustAccessApplication("stremio-catalog", {
        accountId: config.accountId,
        name: "AIOStreams - Catalog (Public)",
        type: "self_hosted",
        sessionDuration: "24h",
        destinations: [
            { uri: `${config.domainName}/catalog/*` },
            { uri: `${config.domainName}/*/catalog/*` },
        ],
        policies: [
            { id: bypassPolicy.id },
        ],
    }, opts);

    // Stream endpoint - Public
    new cloudflare.ZeroTrustAccessApplication("stremio-stream", {
        accountId: config.accountId,
        name: "AIOStreams - Stream (Public)",
        type: "self_hosted",
        sessionDuration: "24h",
        destinations: [
            { uri: `${config.domainName}/stream/*` },
            { uri: `${config.domainName}/*/stream/*` },
        ],
        policies: [
            { id: bypassPolicy.id },
        ],
    }, opts);

    // Meta endpoint - Public
    new cloudflare.ZeroTrustAccessApplication("stremio-meta", {
        accountId: config.accountId,
        name: "AIOStreams - Meta (Public)",
        type: "self_hosted",
        sessionDuration: "24h",
        destinations: [
            { uri: `${config.domainName}/meta/*` },
            { uri: `${config.domainName}/*/meta/*` },
        ],
        policies: [
            { id: bypassPolicy.id },
        ],
    }, opts);

    // Subtitles endpoint - Public
    new cloudflare.ZeroTrustAccessApplication("stremio-subtitles", {
        accountId: config.accountId,
        name: "AIOStreams - Subtitles (Public)",
        type: "self_hosted",
        sessionDuration: "24h",
        destinations: [
            { uri: `${config.domainName}/subtitles/*` },
            { uri: `${config.domainName}/*/subtitles/*` },
        ],
        policies: [
            { id: bypassPolicy.id },
        ],
    }, opts);

    // --- Access Applications (Protected) ---

    // Configure page - Protected
    new cloudflare.ZeroTrustAccessApplication("stremio-configure", {
        accountId: config.accountId,
        name: "AIOStreams - Configure (Protected)",
        type: "self_hosted",
        sessionDuration: "24h",
        destinations: [
            { uri: `${config.domainName}/stremio/configure` },
            { uri: `${config.domainName}/stremio/configure/*` },
        ],
        policies: [
            { id: adminPolicy.id },
        ],
    }, opts);

    // Homepage - Protected
    new cloudflare.ZeroTrustAccessApplication("stremio-homepage", {
        accountId: config.accountId,
        name: "AIOStreams - Homepage (Protected)",
        type: "self_hosted",
        sessionDuration: "24h",
        destinations: [
            { uri: config.domainName },
        ],
        policies: [
            { id: adminPolicy.id },
        ],
    }, opts);

    return {
        bypassPolicyId: bypassPolicy.id,
        adminPolicyId: adminPolicy.id,
    };
}
