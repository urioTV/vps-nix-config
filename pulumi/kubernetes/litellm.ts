import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as images from "../image-versions-manifest.json";
import { getServiceIP } from "./networking";

export interface LiteLLMConfig {
    namespace: k8s.core.v1.Namespace;
    postgresServiceName: string;
    domain: string;
    tunnelToken: pulumi.Output<string>;
}

export interface LiteLLMOutputs {
    deployment: k8s.apps.v1.Deployment;
    service: k8s.core.v1.Service;
    secret: k8s.core.v1.Secret;
    tunnelDeployment: k8s.apps.v1.Deployment;
}

export function deployLiteLLM(
    config: LiteLLMConfig,
    provider: k8s.Provider,
    masterKey: string,
    saltKey: string,
    postgresPassword: string
): LiteLLMOutputs {
    const ns = config.namespace.metadata.name;
    const appName = "litellm";

    const secret = new k8s.core.v1.Secret(
        `${appName}-secrets`,
        {
            metadata: { name: `${appName}-secrets`, namespace: ns },
            stringData: {
                "master-key": masterKey,
                "salt-key": saltKey,
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    const databaseUrl = pulumi.interpolate`postgresql://llmproxy:${postgresPassword}@${config.postgresServiceName}:5432/litellm`;

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
                            name: "litellm",
                            image: `${images.litellm.image}:${images.litellm.tag}`,
                            env: [
                                { name: "DATABASE_URL", value: databaseUrl },
                                {
                                    name: "LITELLM_MASTER_KEY",
                                    valueFrom: { secretKeyRef: { name: `${appName}-secrets`, key: "master-key" } },
                                },
                                {
                                    name: "LITELLM_SALT_KEY",
                                    valueFrom: { secretKeyRef: { name: `${appName}-secrets`, key: "salt-key" } },
                                },
                                { name: "STORE_MODEL_IN_DB", value: "True" },
                            ],
                            ports: [{ containerPort: 4000 }],
                            resources: {
                                requests: { cpu: "100m", memory: "512Mi" },
                                limits: { cpu: "1000m", memory: "1Gi" },
                            },
                            readinessProbe: {
                                httpGet: { path: "/health/liveliness", port: 4000 },
                                initialDelaySeconds: 30,
                                periodSeconds: 10,
                            },
                            livenessProbe: {
                                httpGet: { path: "/health/liveliness", port: 4000 },
                                initialDelaySeconds: 60,
                                periodSeconds: 30,
                            },
                        }],
                    },
                },
            },
        },
        { provider, dependsOn: [config.namespace, secret] }
    );

    const service = new k8s.core.v1.Service(
        appName,
        {
            metadata: { name: appName, namespace: ns },
            spec: {
                type: "ClusterIP",
                clusterIP: getServiceIP("litellm"),
                selector: { app: appName },
                ports: [{ port: 4000, targetPort: 4000 }],
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    const tunnelSecret = new k8s.core.v1.Secret(
        `${appName}-tunnel-secret`,
        {
            metadata: { name: `${appName}-tunnel-secret`, namespace: ns },
            stringData: {
                TUNNEL_TOKEN: config.tunnelToken,
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    const tunnelDeployment = new k8s.apps.v1.Deployment(
        `${appName}-tunnel`,
        {
            metadata: { name: `${appName}-tunnel`, namespace: ns },
            spec: {
                replicas: 1,
                selector: { matchLabels: { app: `${appName}-tunnel` } },
                template: {
                    metadata: { labels: { app: `${appName}-tunnel` } },
                    spec: {
                        containers: [{
                            name: "cloudflared",
                            image: `${images.cloudflared.image}:${images.cloudflared.tag}`,
                            args: ["tunnel", "--no-autoupdate", "run"],
                            env: [{
                                name: "TUNNEL_TOKEN",
                                valueFrom: {
                                    secretKeyRef: {
                                        name: `${appName}-tunnel-secret`,
                                        key: "TUNNEL_TOKEN",
                                    },
                                },
                            }],
                        }],
                    },
                },
            },
        },
        { provider, dependsOn: [tunnelSecret] }
    );

    return { deployment, service, secret, tunnelDeployment };
}
