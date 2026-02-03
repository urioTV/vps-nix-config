import * as k8s from "@pulumi/kubernetes";
import * as images from "../../image-versions-manifest.json";

export interface FlaresolverrConfig {
    namespace: k8s.core.v1.Namespace;
}

/**
 * Deploy FlareSolverr for Cloudflare bypass
 */
export function deployFlaresolverr(
    config: FlaresolverrConfig,
    provider: k8s.Provider
) {
    const ns = config.namespace.metadata.name;

    // Deployment
    const deployment = new k8s.apps.v1.Deployment(
        "flaresolverr",
        {
            metadata: {
                name: "flaresolverr",
                namespace: ns,
            },
            spec: {
                selector: { matchLabels: { app: "flaresolverr" } },
                template: {
                    metadata: { labels: { app: "flaresolverr" } },
                    spec: {
                        containers: [
                            {
                                name: "flaresolverr",
                                image: `${images.flaresolverr.image}:${images.flaresolverr.tag}`,
                                ports: [{ containerPort: 8191 }],
                                env: [
                                    { name: "LOG_LEVEL", value: "info" },
                                    { name: "TZ", value: "Europe/Warsaw" },
                                ],
                            },
                        ],
                    },
                },
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    // Service
    const service = new k8s.core.v1.Service(
        "flaresolverr",
        {
            metadata: {
                name: "flaresolverr",
                namespace: ns,
            },
            spec: {
                selector: { app: "flaresolverr" },
                type: "ClusterIP",
                clusterIP: "10.43.200.202",
                ports: [{ port: 80, targetPort: 8191 }],
            },
        },
        { provider, dependsOn: [deployment] }
    );

    return { deployment, service };
}
