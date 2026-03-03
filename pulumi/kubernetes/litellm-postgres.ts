import * as k8s from "@pulumi/kubernetes";
import * as images from "../image-versions-manifest.json";

export interface LiteLLMPostgresConfig {
    namespace: k8s.core.v1.Namespace;
}

export interface LiteLLMPostgresOutputs {
    deployment: k8s.apps.v1.Deployment;
    service: k8s.core.v1.Service;
    secret: k8s.core.v1.Secret;
    pvc: k8s.core.v1.PersistentVolumeClaim;
    serviceName: string;
}

export function deployLiteLLMPostgres(
    config: LiteLLMPostgresConfig,
    provider: k8s.Provider,
    postgresPassword: string
): LiteLLMPostgresOutputs {
    const ns = config.namespace.metadata.name;
    const appName = "litellm-postgres";

    const secret = new k8s.core.v1.Secret(
        `${appName}-secrets`,
        {
            metadata: { name: `${appName}-secrets`, namespace: ns },
            stringData: {
                password: postgresPassword,
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    const pvc = new k8s.core.v1.PersistentVolumeClaim(
        `${appName}-pvc`,
        {
            metadata: { name: `${appName}-pvc`, namespace: ns },
            spec: {
                accessModes: ["ReadWriteOnce"],
                storageClassName: "longhorn",
                resources: { requests: { storage: "5Gi" } },
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    const deployment = new k8s.apps.v1.Deployment(
        appName,
        {
            metadata: { name: appName, namespace: ns },
            spec: {
                replicas: 1,
                selector: { matchLabels: { app: appName } },
                template: {
                    metadata: { labels: { app: appName } },
                    spec: {
                        containers: [{
                            name: "postgres",
                            image: `${images["litellm-postgres"].image}:${images["litellm-postgres"].tag}`,
                            env: [
                                { name: "POSTGRES_DB", value: "litellm" },
                                { name: "POSTGRES_USER", value: "llmproxy" },
                                {
                                    name: "POSTGRES_PASSWORD",
                                    valueFrom: { secretKeyRef: { name: `${appName}-secrets`, key: "password" } },
                                },
                                { name: "PGDATA", value: "/var/lib/postgresql/data/pgdata" },
                            ],
                            ports: [{ containerPort: 5432 }],
                            volumeMounts: [{ name: "data", mountPath: "/var/lib/postgresql/data" }],
                            resources: {
                                requests: { cpu: "100m", memory: "256Mi" },
                                limits: { cpu: "500m", memory: "512Mi" },
                            },
                        }],
                        volumes: [{
                            name: "data",
                            persistentVolumeClaim: { claimName: `${appName}-pvc` },
                        }],
                    },
                },
            },
        },
        { provider, dependsOn: [config.namespace, pvc, secret] }
    );

    const service = new k8s.core.v1.Service(
        appName,
        {
            metadata: { name: appName, namespace: ns },
            spec: {
                type: "ClusterIP",
                selector: { app: appName },
                ports: [{ port: 5432, targetPort: 5432 }],
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    return { deployment, service, secret, pvc, serviceName: appName };
}
