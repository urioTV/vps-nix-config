import * as k8s from "@pulumi/kubernetes";

export interface CertManagerConfig {
    namespace: k8s.core.v1.Namespace;
    cloudflareApiToken: string;
    cloudflareEmail: string;
}

/**
 * Deploy cert-manager with Cloudflare DNS-01 ClusterIssuer
 * Enables automatic Let's Encrypt certificates via DNS challenge
 */
export function deployCertManager(config: CertManagerConfig, provider: k8s.Provider) {
    const ns = config.namespace.metadata.name;

    // cert-manager Helm release
    const certManager = new k8s.helm.v3.Release(
        "cert-manager",
        {
            name: "cert-manager",
            namespace: ns,
            chart: "cert-manager",
            version: "v1.14.5",
            repositoryOpts: {
                repo: "https://charts.jetstack.io",
            },
            values: {
                installCRDs: true,
                serviceAccount: {
                    create: true,
                },
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    // Cloudflare API token secret for DNS-01 challenge
    const cloudflareSecret = new k8s.core.v1.Secret(
        "cloudflare-api-token",
        {
            metadata: {
                name: "cloudflare-api-token",
                namespace: ns,
                labels: {
                    "cert-manager.io/cloudflare-api-token": "true",
                },
            },
            stringData: {
                "api-token": config.cloudflareApiToken,
            },
        },
        { provider, dependsOn: [certManager] }
    );

    // ClusterIssuer for Let's Encrypt via DNS-01 (Cloudflare)
    const clusterIssuer = new k8s.apiextensions.CustomResource(
        "letsencrypt-cloudflare",
        {
            apiVersion: "cert-manager.io/v1",
            kind: "ClusterIssuer",
            metadata: {
                name: "letsencrypt-cloudflare",
            },
            spec: {
                acme: {
                    server: "https://acme-v02.api.letsencrypt.org/directory",
                    email: config.cloudflareEmail,
                    privateKeySecretRef: {
                        name: "letsencrypt-cloudflare-private-key",
                    },
                    solvers: [
                        {
                            dns01: {
                                cloudflare: {
                                    apiTokenSecretRef: {
                                        name: "cloudflare-api-token",
                                        key: "api-token",
                                    },
                                },
                            },
                        },
                    ],
                },
            },
        },
        { provider, dependsOn: [cloudflareSecret] }
    );

    return { certManager, cloudflareSecret, clusterIssuer };
}
