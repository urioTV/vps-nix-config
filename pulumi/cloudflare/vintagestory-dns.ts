import * as cloudflare from "@pulumi/cloudflare";

export interface VintageStoryDnsConfig {
    zoneId: string;
    recordName: string;
    serverAddress: string;
    provider: cloudflare.Provider;
}

/**
 * DNS-only record for the Vintage Story game server.
 *
 * The Cloudflare HTTP proxy cannot forward the game protocol, so the record
 * must stay unproxied (grey cloud). Players connect to `<recordName>.<zone>:
 * 42420`.
 */
export function createVintageStoryDns(config: VintageStoryDnsConfig) {
    const opts = { provider: config.provider };
    const record = new cloudflare.DnsRecord("vintagestory-dns", {
        zoneId: config.zoneId,
        name: config.recordName,
        content: config.serverAddress,
        type: "A",
        proxied: false,
        ttl: 300,
        comment: "Vintage Story game server on ratmachine",
    }, { ...opts, ignoreChanges: ["name"] });
    return { record };
}
