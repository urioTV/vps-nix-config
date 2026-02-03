import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export interface AiostreamsConfig {
    namespace: k8s.core.v1.Namespace;
    tunnelToken: pulumi.Output<string>;
    secretKey: string;
    domain: string;
}

/**
 * Deploy AIOStreams application with Cloudflare Tunnel sidecar
 */
export function deployAiostreams(
    config: AiostreamsConfig,
    provider: k8s.Provider
) {
    const ns = config.namespace.metadata.name;

    // PVC for AIOStreams data
    const pvc = new k8s.core.v1.PersistentVolumeClaim(
        "aiostreams-pvc",
        {
            metadata: {
                name: "aiostreams-pvc",
                namespace: ns,
            },
            spec: {
                accessModes: ["ReadWriteOnce"],
                storageClassName: "longhorn",
                resources: {
                    requests: { storage: "1Gi" },
                },
            },
        },
        { provider, dependsOn: [config.namespace] }
    );


    // Secret for environment variables
    const secret = new k8s.core.v1.Secret(
        "aiostreams-env",
        {
            metadata: {
                name: "aiostreams-env",
                namespace: ns,
            },
            stringData: {
                SECRET_KEY: config.secretKey,
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    // ConfigMap
    const configMap = new k8s.core.v1.ConfigMap(
        "aiostreams-config",
        {
            metadata: {
                name: "aiostreams-config",
                namespace: ns,
            },
            data: {
                NODE_ENV: "production",
                BASE_URL: `https://${config.domain}`,
                PORT: "3000",
                LOG_LEVEL: "info",
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    // Main deployment
    const deployment = new k8s.apps.v1.Deployment(
        "aiostreams",
        {
            metadata: {
                name: "aiostreams",
                namespace: ns,
            },
            spec: {
                selector: { matchLabels: { app: "aiostreams" } },
                template: {
                    metadata: { labels: { app: "aiostreams" } },
                    spec: {
                        hostAliases: [
                            {
                                ip: "10.43.200.200",
                                hostnames: ["aiometadata"],
                            },
                            {
                                ip: "10.43.200.201",
                                hostnames: ["jackett"],
                            },
                        ],
                        containers: [
                            {
                                name: "aiostreams",
                                image: "ghcr.io/viren070/aiostreams:latest",
                                ports: [{ containerPort: 3000 }],
                                envFrom: [
                                    { secretRef: { name: "aiostreams-env" } },
                                    { configMapRef: { name: "aiostreams-config" } },
                                ],
                                volumeMounts: [
                                    { name: "aiostreams-data", mountPath: "/app/data" },
                                ],
                            },
                        ],
                        volumes: [
                            {
                                name: "aiostreams-data",
                                persistentVolumeClaim: { claimName: "aiostreams-pvc" },
                            },
                        ],
                    },
                },
            },
        },
        { provider, dependsOn: [secret, configMap] }
    );

    // Service
    const service = new k8s.core.v1.Service(
        "aiostreams",
        {
            metadata: {
                name: "aiostreams",
                namespace: ns,
            },
            spec: {
                selector: { app: "aiostreams" },
                ports: [{ port: 3000, targetPort: 3000 }],
            },
        },
        { provider, dependsOn: [deployment] }
    );

    // Cloudflare Tunnel sidecar
    const tunnelSecret = new k8s.core.v1.Secret(
        "aiostreams-tunnel-secret",
        {
            metadata: {
                name: "aiostreams-tunnel-secret",
                namespace: ns,
            },
            stringData: {
                TUNNEL_TOKEN: config.tunnelToken,
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    const tunnelDeployment = new k8s.apps.v1.Deployment(
        "aiostreams-tunnel",
        {
            metadata: {
                name: "aiostreams-tunnel",
                namespace: ns,
            },
            spec: {
                selector: { matchLabels: { app: "aiostreams-tunnel" } },
                template: {
                    metadata: { labels: { app: "aiostreams-tunnel" } },
                    spec: {
                        containers: [
                            {
                                name: "cloudflared",
                                image: "cloudflare/cloudflared:latest",
                                args: ["tunnel", "--no-autoupdate", "run"],
                                env: [
                                    {
                                        name: "TUNNEL_TOKEN",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: "aiostreams-tunnel-secret",
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

    return { deployment, service, pvc, tunnelDeployment };
}
