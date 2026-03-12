import * as k8s from "@pulumi/kubernetes";
import * as images from "../../image-versions-manifest.json";
import { getServiceIP } from "../networking";

export interface CliProxyApiConfig {
    namespace: k8s.core.v1.Namespace;
}

export function deployCliProxyApi(config: CliProxyApiConfig, provider: k8s.Provider) {
    const ns = config.namespace.metadata.name;

    const cfg = new k8s.core.v1.ConfigMap(
        "cli-proxy-api-config",
        {
            metadata: {
                name: "cli-proxy-api-config",
                namespace: ns,
            },
            data: {
                "config.yaml": `port: 8317
host: ''
auth-dir: '/root/.cli-proxy-api'
`,
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    const pvc = new k8s.core.v1.PersistentVolumeClaim(
        "cli-proxy-api-pvc",
        {
            metadata: {
                name: "cli-proxy-api-pvc",
                namespace: ns,
            },
            spec: {
                accessModes: ["ReadWriteOnce"],
                storageClassName: "longhorn",
                resources: { requests: { storage: "1Gi" } },
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    const deployment = new k8s.apps.v1.Deployment(
        "cli-proxy-api",
        {
            metadata: {
                name: "cli-proxy-api",
                namespace: ns,
            },
            spec: {
                selector: { matchLabels: { app: "cli-proxy-api" } },
                template: {
                    metadata: { labels: { app: "cli-proxy-api" } },
                    spec: {
                        containers: [
                            {
                                name: "cli-proxy-api",
                                image: `${images["cli-proxy-api"].image}:${images["cli-proxy-api"].tag}`,
                                ports: [{ containerPort: 8317 }],
                                resources: {
                                    requests: { memory: "128Mi", cpu: "100m" },
                                    limits: { memory: "256Mi", cpu: "200m" },
                                },
                                volumeMounts: [
                                    { name: "data", mountPath: "/root/.cli-proxy-api" },
                                    {
                                        name: "config",
                                        mountPath: "/CLIProxyAPI/config.yaml",
                                        subPath: "config.yaml",
                                    },
                                ],
                            },
                        ],
                        volumes: [
                            { name: "data", persistentVolumeClaim: { claimName: pvc.metadata.name } },
                            { name: "config", configMap: { name: cfg.metadata.name } },
                        ],
                    },
                },
            },
        },
        { provider, dependsOn: [cfg, pvc] }
    );

    const service = new k8s.core.v1.Service(
        "cli-proxy-api",
        {
            metadata: {
                name: "cli-proxy-api",
                namespace: ns,
            },
            spec: {
                type: "ClusterIP",
                clusterIP: getServiceIP("cli-proxy-api"),
                selector: { app: "cli-proxy-api" },
                ports: [{ port: 8317, targetPort: 8317 }],
            },
        },
        { provider, dependsOn: [deployment] }
    );

    return { deployment, service, pvc, cfg };
}
