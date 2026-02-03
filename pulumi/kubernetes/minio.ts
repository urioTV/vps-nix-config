import * as k8s from "@pulumi/kubernetes";

export interface MinioConfig {
    namespace: k8s.core.v1.Namespace;
    rootUser: string;
    rootPassword: string;
}

/**
 * Deploy MinIO for S3-compatible object storage
 */
export function deployMinio(config: MinioConfig, provider: k8s.Provider) {
    const ns = config.namespace.metadata.name;

    // PV using hostPath
    const pv = new k8s.core.v1.PersistentVolume(
        "minio-pv",
        {
            metadata: {
                name: "minio-pv",
            },
            spec: {
                capacity: { storage: "10Gi" },
                accessModes: ["ReadWriteOnce"],
                hostPath: { path: "/mnt/data/minio" },
                storageClassName: "manual",
            },
        },
        { provider }
    );

    // PVC
    const pvc = new k8s.core.v1.PersistentVolumeClaim(
        "minio-pvc",
        {
            metadata: {
                name: "minio-pvc",
                namespace: ns,
            },
            spec: {
                accessModes: ["ReadWriteOnce"],
                storageClassName: "manual",
                resources: {
                    requests: { storage: "10Gi" },
                },
            },
        },
        { provider, dependsOn: [config.namespace, pv] }
    );


    // Secret for credentials
    const secret = new k8s.core.v1.Secret(
        "minio-credentials",
        {
            metadata: {
                name: "minio-credentials",
                namespace: ns,
            },
            stringData: {
                MINIO_ROOT_USER: config.rootUser,
                MINIO_ROOT_PASSWORD: config.rootPassword,
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    // Deployment
    const deployment = new k8s.apps.v1.Deployment(
        "minio",
        {
            metadata: {
                name: "minio",
                namespace: ns,
            },
            spec: {
                selector: { matchLabels: { app: "minio" } },
                template: {
                    metadata: { labels: { app: "minio" } },
                    spec: {
                        containers: [
                            {
                                name: "minio",
                                image: "minio/minio:latest",
                                args: ["server", "/data", "--console-address", ":9001"],
                                ports: [
                                    { containerPort: 9000, name: "api" },
                                    { containerPort: 9001, name: "console" },
                                ],
                                envFrom: [{ secretRef: { name: "minio-credentials" } }],
                                volumeMounts: [{ name: "data", mountPath: "/data" }],
                            },
                        ],
                        volumes: [
                            {
                                name: "data",
                                persistentVolumeClaim: { claimName: "minio-pvc" },
                            },
                        ],
                    },
                },
            },
        },
        { provider, dependsOn: [secret, pvc] }
    );

    // Service
    const service = new k8s.core.v1.Service(
        "minio",
        {
            metadata: {
                name: "minio",
                namespace: ns,
            },
            spec: {
                selector: { app: "minio" },
                ports: [
                    { port: 9000, targetPort: 9000, name: "api" },
                    { port: 9001, targetPort: 9001, name: "console" },
                ],
            },
        },
        { provider, dependsOn: [deployment] }
    );

    return { deployment, service, pvc, pv };
}
