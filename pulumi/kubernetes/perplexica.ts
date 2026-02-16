import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as images from "../image-versions-manifest.json";

export interface PerplexicaConfig {
    namespace: k8s.core.v1.Namespace;
    tunnelToken: pulumi.Output<string>;
    domain: string;
}

/**
 * Deploy Perplexica to Kubernetes
 * Note: SearXNG is bundled inside the Perplexica image.
 */
export function deployPerplexica(
    config: PerplexicaConfig,
    provider: k8s.Provider
) {
    const ns = config.namespace.metadata.name;

    // --- Perplexica App ---

    const appService = new k8s.core.v1.Service(
        "perplexica",
        {
            metadata: {
                name: "perplexica",
                namespace: ns,
            },
            spec: {
                selector: { app: "perplexica" },
                ports: [{ port: 3000, targetPort: 3000 }],
            },
        },
        { provider }
    );

    const dataPvc = new k8s.core.v1.PersistentVolumeClaim(
        "perplexica-data",
        {
            metadata: {
                name: "perplexica-data",
                namespace: ns,
            },
            spec: {
                accessModes: ["ReadWriteOnce"],
                resources: { requests: { storage: "5Gi" } },
                storageClassName: "longhorn",
            },
        },
        { provider }
    );

    const appDeployment = new k8s.apps.v1.Deployment(
        "perplexica",
        {
            metadata: {
                name: "perplexica",
                namespace: ns,
            },
            spec: {
                selector: { matchLabels: { app: "perplexica" } },
                template: {
                    metadata: { labels: { app: "perplexica" } },
                    spec: {
                        containers: [
                            {
                                name: "app",
                                image: `${images.perplexica.image}:${images.perplexica.tag}`,
                                env: [
                                    { name: "SEARXNG_API_URL", value: "http://127.0.0.1:8080" },
                                    { name: "DATA_DIR", value: "/home/perplexica" },
                                ],
                                ports: [{ containerPort: 3000 }],
                                volumeMounts: [
                                    {
                                        name: "data",
                                        mountPath: "/home/perplexica/data",
                                    },
                                ],
                            },
                        ],
                        volumes: [
                            {
                                name: "data",
                                persistentVolumeClaim: { claimName: dataPvc.metadata.name },
                            },
                        ],
                    },
                },
            },
        },
        { provider, dependsOn: [dataPvc] }
    );

    // --- Cloudflare Tunnel ---

    const tunnelSecret = new k8s.core.v1.Secret(
        "perplexica-tunnel-secret",
        {
            metadata: {
                name: "perplexica-tunnel-secret",
                namespace: ns,
            },
            stringData: {
                TUNNEL_TOKEN: config.tunnelToken,
            },
        },
        { provider }
    );

    const tunnelDeployment = new k8s.apps.v1.Deployment(
        "perplexica-tunnel",
        {
            metadata: {
                name: "perplexica-tunnel",
                namespace: ns,
            },
            spec: {
                selector: { matchLabels: { app: "perplexica-tunnel" } },
                template: {
                    metadata: { labels: { app: "perplexica-tunnel" } },
                    spec: {
                        containers: [
                            {
                                name: "cloudflared",
                                image: `${images.cloudflared.image}:${images.cloudflared.tag}`,
                                args: ["tunnel", "--no-autoupdate", "run"],
                                env: [
                                    {
                                        name: "TUNNEL_TOKEN",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: "perplexica-tunnel-secret",
                                                key: "TUNNEL_TOKEN",
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                },
            },
        },
        { provider, dependsOn: [tunnelSecret] }
    );

    return { appDeployment, tunnelDeployment };
}
