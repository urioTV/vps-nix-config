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
            version: "v3.32.1", // Kubernetes 1.35 is tested with Calico 3.32
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

    // NetBird attaches its own XDP program to loopback. Felix must not try to
    // replace it while Calico uses the iptables dataplane.
    const felixConfiguration = new k8s.apiextensions.CustomResourcePatch(
        "calico-felix-configuration",
        {
            apiVersion: "crd.projectcalico.org/v1",
            kind: "FelixConfiguration",
            metadata: {
                name: "default",
                annotations: {
                    "pulumi.com/patchForce": "true",
                },
            },
            spec: {
                xdpEnabled: false,
            },
        },
        { provider, dependsOn: [release] }
    );

    return { release, felixConfiguration };
}
