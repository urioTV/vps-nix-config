import * as k8s from "@pulumi/kubernetes";

/**
 * Deploy Longhorn storage via Helm
 */
export function deployLonghorn(provider: k8s.Provider) {
    const release = new k8s.helm.v3.Release(
        "longhorn",
        {
            chart: "longhorn",
            version: "1.8.0",
            repositoryOpts: {
                repo: "https://charts.longhorn.io",
            },
            namespace: "longhorn-system",
            createNamespace: true,
            values: {
                persistence: {
                    defaultClassReplicaCount: 1,
                },
                defaultSettings: {
                    defaultReplicaCount: 1,
                },
            },
        },
        { provider }
    );

    return { release };
}
