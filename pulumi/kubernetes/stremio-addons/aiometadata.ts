import * as k8s from "@pulumi/kubernetes";
import * as images from "../../image-versions-manifest.json";
import * as pulumi from "@pulumi/pulumi";

export interface AiometadataConfig {
    namespace: k8s.core.v1.Namespace;
}

/**
 * Deploy AIOMETadata application with Redis cache
 */
export function deployAiometadata(
    config: AiometadataConfig,
    provider: k8s.Provider
) {
    const ns = config.namespace.metadata.name;

    // PVC for AIOMETadata data
    const pvc = new k8s.core.v1.PersistentVolumeClaim(
        "aiometadata-pvc",
        {
            metadata: {
                name: "aiometadata-pvc",
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

    // ConfigMap for environment
    const configMap = new k8s.core.v1.ConfigMap(
        "aiometadata-env",
        {
            metadata: {
                name: "aiometadata-env",
                namespace: ns,
            },
            data: {
                NODE_ENV: "production",
                REDIS_HOST: "aiometadata-redis",
                REDIS_PORT: "6379",
                REDIS_URI: "redis://aiometadata-redis:6379",
                REDIS_URL: "redis://aiometadata-redis:6379",
                CACHE_URL: "redis://aiometadata-redis:6379",
                CACHE_URI: "redis://aiometadata-redis:6379",
                HOST_NAME: "http://aiometadata",
                DATABASE_URI: "sqlite:///app/addon/data/database.sqlite",
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    // Redis deployment
    const redisDeployment = new k8s.apps.v1.Deployment(
        "aiometadata-redis",
        {
            metadata: {
                name: "aiometadata-redis",
                namespace: ns,
            },
            spec: {
                selector: { matchLabels: { app: "aiometadata-redis" } },
                template: {
                    metadata: { labels: { app: "aiometadata-redis" } },
                    spec: {
                        containers: [
                            {
                                name: "redis",
                                image: `${images.redis.image}:${images.redis.tag}`,
                                ports: [{ containerPort: 6379 }],
                            },
                        ],
                    },
                },
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    // Redis service
    new k8s.core.v1.Service(
        "aiometadata-redis",
        {
            metadata: {
                name: "aiometadata-redis",
                namespace: ns,
            },
            spec: {
                selector: { app: "aiometadata-redis" },
                ports: [{ port: 6379, targetPort: 6379 }],
            },
        },
        { provider, dependsOn: [redisDeployment] }
    );

    // Main deployment
    const deployment = new k8s.apps.v1.Deployment(
        "aiometadata",
        {
            metadata: {
                name: "aiometadata",
                namespace: ns,
            },
            spec: {
                selector: { matchLabels: { app: "aiometadata" } },
                template: {
                    metadata: { labels: { app: "aiometadata" } },
                    spec: {
                        containers: [
                            {
                                name: "aiometadata",
                                image: `${images.aiometadata.image}:${images.aiometadata.tag}`,
                                ports: [{ containerPort: 3232 }],
                                envFrom: [{ configMapRef: { name: "aiometadata-env" } }],
                                volumeMounts: [
                                    { name: "aiometadata-data", mountPath: "/app/addon/data" },
                                ],
                            },
                        ],
                        volumes: [
                            {
                                name: "aiometadata-data",
                                persistentVolumeClaim: { claimName: "aiometadata-pvc" },
                            },
                        ],
                    },
                },
            },
        },
        { provider, dependsOn: [pvc, configMap] }
    );

    // Service
    const service = new k8s.core.v1.Service(
        "aiometadata",
        {
            metadata: {
                name: "aiometadata",
                namespace: ns,
            },
            spec: {
                selector: { app: "aiometadata" },
                type: "ClusterIP",
                clusterIP: "10.43.200.200",
                ports: [{ name: "http", port: 3232, targetPort: 3232 }],
            },
        },
        { provider, dependsOn: [deployment] }
    );

    return { deployment, service, pvc };
}
