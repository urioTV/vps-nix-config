import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

/**
 * Deploy Calico CNI via Tigera Operator Helm chart.
 * This installs the operator and configures the Calico Installation CR.
 */
export function deployCalico(provider: k8s.Provider) {
    const namespace = new k8s.core.v1.Namespace("tigera-operator", {
        metadata: { name: "tigera-operator" },
    }, { provider });

    const release = new k8s.helm.v3.Release(
        "tigera-operator",
        {
            chart: "tigera-operator",
            version: "v3.27.0", // Use a fixed version for stability
            repositoryOpts: {
                repo: "https://docs.tigera.io/calico/charts",
            },
            namespace: namespace.metadata.name,
            values: {
                // Installation CR configuration
                // Ref: https://docs.tigera.io/calico/charts/tigera-operator/values
                installation: {
                    enabled: true,
                    cni: {
                        type: "Calico",
                    },
                    calicoNetwork: {
                        // Match K3s cluster-cidr (default: 10.42.0.0/16)
                        ipPools: [
                            {
                                cidr: "10.42.0.0/16",
                                encapsulation: "VXLAN",
                            },
                        ],
                    },
                },
                // Component configuration
                apiServer: {
                    enabled: true,
                },
            },
        },
        { provider, dependsOn: [namespace] }
    );

    return { release };
}
