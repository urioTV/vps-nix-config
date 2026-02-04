import * as k8s from "@pulumi/kubernetes";
import * as images from "../../image-versions-manifest.json";
import { getServiceIP } from "../networking";

export interface ByparrConfig {
    namespace: k8s.core.v1.Namespace;
}

/**
 * Deploy Byparr for Cloudflare bypass
 * Modern FlareSolverr alternative using camoufox and FastAPI
 * https://github.com/ThePhaseless/Byparr
 */
export function deployByparr(
    config: ByparrConfig,
    provider: k8s.Provider
) {
    const ns = config.namespace.metadata.name;

    // Deployment
    const deployment = new k8s.apps.v1.Deployment(
        "byparr",
        {
            metadata: {
                name: "byparr",
                namespace: ns,
            },
            spec: {
                selector: { matchLabels: { app: "byparr" } },
                template: {
                    metadata: { labels: { app: "byparr" } },
                    spec: {
                        containers: [
                            {
                                name: "byparr",
                                image: `${images.byparr.image}:${images.byparr.tag}`,
                                ports: [{ containerPort: 8191 }],
                                env: [
                                    { name: "HOST", value: "0.0.0.0" },
                                    { name: "PORT", value: "8191" },
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
        "byparr",
        {
            metadata: {
                name: "byparr",
                namespace: ns,
            },
            spec: {
                selector: { app: "byparr" },
                type: "ClusterIP",
                clusterIP: getServiceIP("byparr"),
                ports: [{ port: 80, targetPort: 8191 }],
            },
        },
        { provider, dependsOn: [deployment] }
    );

    return { deployment, service };
}
