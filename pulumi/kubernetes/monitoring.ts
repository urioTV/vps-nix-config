import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { getServiceIP } from "./networking";

export interface MonitoringConfig {
    namespace: k8s.core.v1.Namespace;
    grafanaPassword: string;
}

export interface MonitoringOutputs {
    grafanaUrl: pulumi.Output<string>;
    release: k8s.helm.v3.Release;
}

/**
 * Deploy Monitoring Stack (Prometheus + Grafana + Node Exporter)
 * Configured for Host Monitoring and Longhorn persistence
 */
export function deployMonitoring(config: MonitoringConfig, provider: k8s.Provider): MonitoringOutputs {
    const ns = config.namespace.metadata.name;

    // Deploy kube-prometheus-stack Helm chart
    const release = new k8s.helm.v3.Release("kube-prometheus-stack", {
        chart: "kube-prometheus-stack",
        version: "69.3.3",
        repositoryOpts: {
            repo: "https://prometheus-community.github.io/helm-charts",
        },
        namespace: ns,
        values: {
            // Prometheus Configuration
            prometheus: {
                prometheusSpec: {
                    // Persistence for Prometheus data
                    storageSpec: {
                        volumeClaimTemplate: {
                            spec: {
                                storageClassName: "longhorn",
                                accessModes: ["ReadWriteOnce"],
                                resources: {
                                    requests: {
                                        storage: "10Gi",
                                    },
                                },
                            },
                        },
                    },
                    // Retention policy
                    retention: "10d",
                },
            },

            // Grafana Configuration
            grafana: {
                // Persistence for Grafana dashboards and users
                persistence: {
                    enabled: true,
                    storageClassName: "longhorn",
                    accessModes: ["ReadWriteOnce"],
                    size: "10Gi",
                },
                adminPassword: config.grafanaPassword,
                // Static IP for easier access
                service: {
                    type: "ClusterIP",
                    clusterIP: getServiceIP("monitoring"),
                },
            },

            // Node Exporter Configuration for Host Monitoring
            // This is CRITICAL for monitoring the VPS host itself
            "prometheus-node-exporter": {
                hostNetwork: true, // Use host network to see actual interfaces
                hostPID: true,     // Monitor host processes
                hostRootFsMount: {
                    enabled: true, // Mount host root fs to /host
                },
                path: {
                    procfs: "/host/proc",
                    sysfs: "/host/sys",
                    rootfs: "/host/root",
                },
                // Ignore container filesystems to avoid clutter
                extraArgs: [
                    "--collector.filesystem.mount-points-exclude=^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/.+)($|/)"
                ],
            },
        },
    }, { provider, dependsOn: config.namespace });

    // Output helpful info
    const grafanaUrl = pulumi.interpolate`http://${getServiceIP("monitoring")}:80`;

    return {
        grafanaUrl,
        release,
    };
}
