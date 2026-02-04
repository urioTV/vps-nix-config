import * as k8s from "@pulumi/kubernetes";

/**
 * Create all application namespaces
 */
export function createNamespaces(provider: k8s.Provider) {
    const namespaces = [
        "aiometadata",
        "aiostreams",
        "jackett",
        "byparr",
        "minio",
    ];

    const nsResources: Record<string, k8s.core.v1.Namespace> = {};

    for (const ns of namespaces) {
        nsResources[ns] = new k8s.core.v1.Namespace(
            ns,
            {
                metadata: { name: ns },
            },
            { provider }
        );
    }

    return nsResources;
}
