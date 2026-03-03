import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as images from "../../image-versions-manifest.json";
import { getServiceIP } from "../networking";
import type { LiteLLMProxyConfig, LiteLLMProxyOutputs } from "./types";
import { generateConfigYaml } from "./models";

export type { LiteLLMProxyConfig, LiteLLMProxyOutputs };

export function deployLiteLLMProxy(
    config: LiteLLMProxyConfig,
    provider: k8s.Provider,
    masterKey: string,
    saltKey: string,
    postgresPassword: string
): LiteLLMProxyOutputs {
    const ns = config.namespace.metadata.name;
    const appName = "litellm";

    const secret = new k8s.core.v1.Secret(
        `${appName}-secrets`,
        {
            metadata: { name: `${appName}-secrets`, namespace: ns },
            stringData: {
                "master-key": masterKey,
                "salt-key": saltKey,
                "openrouter-api-key": config.apiKeys.openrouter,
                "nanogpt-api-key": config.apiKeys.nanogpt,
                "glm-api-key": config.apiKeys.glm,
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    const configMap = new k8s.core.v1.ConfigMap(
        `${appName}-config`,
        {
            metadata: { name: `${appName}-config`, namespace: ns },
            data: {
                "config.yaml": generateConfigYaml(),
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
                            args: ["--config", "/app/config.yaml"],
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
                                {
                                    name: "OPENROUTER_API_KEY",
                                    valueFrom: { secretKeyRef: { name: `${appName}-secrets`, key: "openrouter-api-key" } },
                                },
                                {
                                    name: "NANOGPT_API_KEY",
                                    valueFrom: { secretKeyRef: { name: `${appName}-secrets`, key: "nanogpt-api-key" } },
                                },
                                {
                                    name: "GLM_API_KEY",
                                    valueFrom: { secretKeyRef: { name: `${appName}-secrets`, key: "glm-api-key" } },
                                },
                                { name: "DISABLE_ADMIN_UI", value: "True" },
                            ],
                            ports: [{ containerPort: 4000 }],
                            volumeMounts: [
                                { name: "config", mountPath: "/app/config.yaml", subPath: "config.yaml" },
                            ],
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
                        volumes: [
                            { name: "config", configMap: { name: `${appName}-config` } },
                        ],
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

    return { deployment, service, secret, configMap, tunnelDeployment };
}
