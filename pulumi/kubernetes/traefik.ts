import * as k8s from "@pulumi/kubernetes";

/**
 * Tune the k3s built-in Traefik (installed by k3s, not by Pulumi).
 *
 * Traefik v2.11.2+ and v3 default `respondingTimeouts.readTimeout` to 60s on every
 * entrypoint. readTimeout covers reading the whole request body, so any upload
 * slower than 60s is cut off with a 504/499.
 * Setting it to 0s restores the old unlimited read window. Only the websecure
 * entrypoint is changed, the one serving public HTTPS.
 */
export function configureTraefik(provider: k8s.Provider) {
    return new k8s.apiextensions.CustomResource("traefik-helmchartconfig", {
        apiVersion: "helm.cattle.io/v1",
        kind: "HelmChartConfig",
        metadata: { name: "traefik", namespace: "kube-system" },
        spec: {
            valuesContent: [
                "additionalArguments:",
                "  - \"--entryPoints.websecure.transport.respondingTimeouts.readTimeout=0s\"",
            ].join("\n"),
        },
    }, { provider });
}
