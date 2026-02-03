import * as k8s from "@pulumi/kubernetes";

export interface JackettConfig {
    namespace: k8s.core.v1.Namespace;
}

/**
 * Deploy Jackett for torrent indexer aggregation
 */
export function deployJackett(config: JackettConfig, provider: k8s.Provider) {
    const ns = config.namespace.metadata.name;

    // PVC for config
    const pvc = new k8s.core.v1.PersistentVolumeClaim(
        "jackett-pvc",
        {
            metadata: {
                name: "jackett-config",
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


    // Deployment
    const deployment = new k8s.apps.v1.Deployment(
        "jackett",
        {
            metadata: {
                name: "jackett",
                namespace: ns,
            },
            spec: {
                selector: { matchLabels: { app: "jackett" } },
                template: {
                    metadata: { labels: { app: "jackett" } },
                    spec: {
                        containers: [
                            {
                                name: "jackett",
                                image: "lscr.io/linuxserver/jackett:latest",
                                ports: [{ containerPort: 9117 }],
                                env: [
                                    { name: "PUID", value: "1000" },
                                    { name: "PGID", value: "1000" },
                                    { name: "TZ", value: "Europe/Warsaw" },
                                ],
                                volumeMounts: [
                                    { name: "config", mountPath: "/config" },
                                ],
                            },
                        ],
                        volumes: [
                            {
                                name: "config",
                                persistentVolumeClaim: { claimName: "jackett-config" },
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
        "jackett",
        {
            metadata: {
                name: "jackett",
                namespace: ns,
            },
            spec: {
                selector: { app: "jackett" },
                type: "ClusterIP",
                clusterIP: "10.43.200.201",
                ports: [{ name: "http", port: 80, targetPort: 9117 }],
            },
        },
        { provider, dependsOn: [deployment] }
    );

    return { deployment, service, pvc };
}
