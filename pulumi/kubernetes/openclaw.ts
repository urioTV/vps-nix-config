import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as images from "../image-versions-manifest.json";
import { getServiceIP } from "./networking";

export interface OpenclawConfig {
    namespace: k8s.core.v1.Namespace;
    tunnelToken: pulumi.Output<string>;
    domain: string;
    openrouterApiKey: string;
    gatewayToken: string;
}

/**
 * Deploy OpenClaw AI assistant via Helm chart (serhanekicii/openclaw-helm)
 *
 * Uses app-template with:
 * - Init containers for config merge and skills installation
 * - Chromium sidecar for browser automation (CDP on :9222)
 * - PVC for persistent state/workspace
 * - Cloudflare Tunnel for external access
 */
export function deployOpenclaw(
    config: OpenclawConfig,
    provider: k8s.Provider
) {
    const ns = config.namespace.metadata.name;

    // Secret for API keys and gateway token
    const secret = new k8s.core.v1.Secret(
        "openclaw-env",
        {
            metadata: {
                name: "openclaw-env",
                namespace: ns,
            },
            stringData: {
                OPENROUTER_API_KEY: config.openrouterApiKey,
                OPENCLAW_GATEWAY_TOKEN: config.gatewayToken,
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    // Helm chart deployment
    const release = new k8s.helm.v3.Release(
        "openclaw",
        {
            chart: "openclaw",
            version: "1.3.12",
            repositoryOpts: {
                repo: "https://serhanekicii.github.io/openclaw-helm",
            },
            name: "openclaw",
            namespace: ns,
            values: {
                "app-template": {
                    openclawVersion: "2026.2.9",
                    configMode: "merge",

                    controllers: {
                        main: {
                            containers: {
                                main: {
                                    envFrom: [
                                        { secretRef: { name: "openclaw-env" } },
                                    ],
                                    command: [
                                        "sh",
                                        "-c",
                                        "node dist/index.js gateway --bind lan --port 18789 || (echo 'CRASH DETECTED - RUNNING DOCTOR...' && yes | node dist/index.js doctor --fix && echo 'FIX COMPLETE - RESTARTING...' && exit 1)",
                                    ],
                                },
                            },
                        },
                    },

                    configMaps: {
                        config: {
                            enabled: true,
                            data: {
                                "openclaw.json": JSON.stringify({
                                    gateway: {
                                        port: 18789,
                                        mode: "local",
                                        trustedProxies: ["127.0.0.1", "10.42.0.0/16"],
                                        controlUi: {
                                            allowInsecureAuth: true,
                                        },
                                    },
                                    commands: {
                                        restart: true,
                                    },
                                    env: {
                                        OPENROUTER_API_KEY: "${OPENROUTER_API_KEY}",
                                    },
                                }),
                            },
                        },
                    },

                    service: {
                        main: {
                            controller: "main",
                            ipFamilyPolicy: "SingleStack",
                            ipFamilies: ["IPv4"],
                            // Static ClusterIP for Cloudflare Tunnel
                            clusterIP: getServiceIP("openclaw"),
                            ports: {
                                http: {
                                    port: 18789,
                                },
                            },
                        },
                    },

                    persistence: {
                        data: {
                            enabled: true,
                            type: "persistentVolumeClaim",
                            accessMode: "ReadWriteOnce",
                            size: "15Gi",
                            storageClass: "longhorn",
                        },
                    },
                },
            },
        },
        { provider, dependsOn: [secret, config.namespace] }
    );

    // Cloudflare Tunnel for external access via openclaw.urio.dev
    const tunnelSecret = new k8s.core.v1.Secret(
        "openclaw-tunnel-secret",
        {
            metadata: {
                name: "openclaw-tunnel-secret",
                namespace: ns,
            },
            stringData: {
                TUNNEL_TOKEN: config.tunnelToken,
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    const tunnelDeployment = new k8s.apps.v1.Deployment(
        "openclaw-tunnel",
        {
            metadata: {
                name: "openclaw-tunnel",
                namespace: ns,
            },
            spec: {
                selector: { matchLabels: { app: "openclaw-tunnel" } },
                template: {
                    metadata: { labels: { app: "openclaw-tunnel" } },
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
                                                name: "openclaw-tunnel-secret",
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

    return { release, tunnelDeployment };
}
