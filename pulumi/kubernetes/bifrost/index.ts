import * as k8s from "@pulumi/kubernetes";
import { getServiceIP } from "../networking";

export interface BifrostConfig {
    namespace: k8s.core.v1.Namespace;
}

export function deployBifrost(config: BifrostConfig, provider: k8s.Provider) {
    const ns = config.namespace.metadata.name;

    const pvc = new k8s.core.v1.PersistentVolumeClaim(
        "bifrost-pvc",
        {
            metadata: {
                name: "bifrost-pvc",
                namespace: ns,
            },
            spec: {
                accessModes: ["ReadWriteOnce"],
                storageClassName: "longhorn",
                resources: { requests: { storage: "10Gi" } },
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    const statefulset = new k8s.apps.v1.StatefulSet(
        "bifrost",
        {
            metadata: {
                name: "bifrost",
                namespace: ns,
            },
            spec: {
                serviceName: "bifrost",
                selector: { matchLabels: { app: "bifrost" } },
                replicas: 1,
                template: {
                    metadata: { labels: { app: "bifrost" } },
                    spec: {
                        containers: [
                            {
                                name: "bifrost",
                                image: "docker.io/maximhq/bifrost:v1.5.2",
                                ports: [{ containerPort: 8080 }],
                                resources: {
                                    requests: { cpu: "250m", memory: "256Mi" },
                                    limits: { cpu: "500m", memory: "512Mi" },
                                },
                                volumeMounts: [
                                    { name: "data", mountPath: "/app/data" },
                                ],
                            },
                        ],
                    },
                },
                volumeClaimTemplates: [
                    {
                        metadata: { name: "data" },
                        spec: {
                            accessModes: ["ReadWriteOnce"],
                            storageClassName: "longhorn",
                            resources: { requests: { storage: "10Gi" } },
                        },
                    },
                ],
            },
        },
        { provider, dependsOn: [pvc] }
    );

    const service = new k8s.core.v1.Service(
        "bifrost",
        {
            metadata: {
                name: "bifrost",
                namespace: ns,
            },
            spec: {
                type: "ClusterIP",
                clusterIP: getServiceIP("bifrost"),
                selector: { app: "bifrost" },
                ports: [{ port: 8080, targetPort: 8080 }],
            },
        },
        { provider, dependsOn: [statefulset] }
    );

    return { statefulset, service, pvc };
}
