import * as cloudflare from "@pulumi/cloudflare";
import * as random from "@pulumi/random";
import * as pulumi from "@pulumi/pulumi";

export interface TunnelConfig {
    accountId: string;
    zoneId: string;
    tunnelName: string;
    domainName: string;
    dnsRecordName: string;
    serviceUrl: string;
    provider: cloudflare.Provider;
}

export interface TunnelOutputs {
    tunnelId: pulumi.Output<string>;
    tunnelToken: pulumi.Output<string>;
    tunnelSecret: pulumi.Output<string>;
}

/**
 * Create Cloudflare Tunnel with DNS record and ingress configuration
 */
export function createTunnel(config: TunnelConfig): TunnelOutputs {
    const opts = { provider: config.provider };

    // Generate tunnel secret
    const tunnelSecret = new random.RandomId("tunnel-secret", {
        byteLength: 35,
    });

    // Create the tunnel
    const tunnel = new cloudflare.ZeroTrustTunnelCloudflared("aiostreams-tunnel", {
        accountId: config.accountId,
        name: config.tunnelName,
        tunnelSecret: tunnelSecret.hex.apply((hex) => Buffer.from(hex).toString("base64")),
    }, opts);

    // Get tunnel token
    const tunnelToken = cloudflare.getZeroTrustTunnelCloudflaredTokenOutput({
        accountId: config.accountId,
        tunnelId: tunnel.id,
    }, opts);

    // Configure tunnel ingress
    new cloudflare.ZeroTrustTunnelCloudflaredConfig("aiostreams-tunnel-config", {
        accountId: config.accountId,
        tunnelId: tunnel.id,
        config: {
            ingresses: [
                {
                    hostname: config.domainName,
                    service: config.serviceUrl,
                },
                {
                    service: "http_status:404",
                },
            ],
        },
    }, opts);

    // Create DNS record pointing to tunnel
    new cloudflare.DnsRecord("aiostreams-dns", {
        zoneId: config.zoneId,
        name: config.dnsRecordName,
        content: pulumi.interpolate`${tunnel.id}.cfargotunnel.com`,
        type: "CNAME",
        proxied: true,
        ttl: 1,
    }, opts);

    return {
        tunnelId: tunnel.id,
        tunnelToken: tunnelToken.token,
        tunnelSecret: tunnelSecret.hex,
    };
}
