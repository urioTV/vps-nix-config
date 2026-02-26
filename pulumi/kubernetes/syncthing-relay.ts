import * as k8s from "@pulumi/kubernetes";
import { getServiceIP } from "./networking";
import * as images from "../image-versions-manifest.json";

/**
 * Deploy Syncthing Relay Server
 *
 * Deploys a private relay server for Syncthing file synchronization.
 * Relay: 22067, External access: 30001 (NodePort)
 *
 * Uses official syncthing/relaysrv image with private pools (-pools=")
 */
export interface SyncthingRelayConfig {
    namespace: k8s.core.v1.Namespace;
}

export function deploySyncthingRelay(
    config: SyncthingRelayConfig,
    provider: k8s.Provider
) {
    const { namespace: ns } = config;

    // PVC for relay certificates
    const pvc = new k8s.core.v1.PersistentVolumeClaim(
        "syncthing-relay-pvc",
        {
            metadata: {
                name: "syncthing-relay-pvc",
                namespace: ns.metadata.name,
            },
            spec: {
                accessModes: ["ReadWriteOnce"],
                resources: {
                    requests: {
                        storage: "1Gi",
                    },
                },
                storageClassName: "longhorn",
            },
        },
        { provider }
    );

    // Deployment
    const deployment = new k8s.apps.v1.Deployment(
        "syncthing-relay",
        {
            metadata: {
                name: "syncthing-relay",
                namespace: ns.metadata.name,
                labels: { app: "syncthing-relay" },
            },
            spec: {
                replicas: 1,
                selector: { matchLabels: { app: "syncthing-relay" } },
                template: {
                    metadata: { labels: { app: "syncthing-relay" } },
                    spec: {
                        containers: [
                            {
                                name: "syncthing-relay",
                                image: `${images["syncthing-relay"].image}:${images["syncthing-relay"].tag}`,
                                args: ["-pools=", "-listen=0.0.0.0:22067"],  // Private relay - no public pools, force IPv4
                                ports: [
                                    { containerPort: 22067, name: "relay" },
                                ],
                                volumeMounts: [
                                    { name: "data", mountPath: "/home/relaysrv/certs" },
                                ],
                            },
                        ],
                        volumes: [
                            {
                                name: "data",
                                persistentVolumeClaim: { claimName: "syncthing-relay-pvc" },
                            },
                        ],
                    },
                },
            },
        },
        { provider, dependsOn: [pvc] }
    );

    // ClusterIP Service with static IP
    const service = new k8s.core.v1.Service(
        "syncthing-relay",
        {
            metadata: {
                name: "syncthing-relay",
                namespace: ns.metadata.name,
            },
            spec: {
                type: "ClusterIP",
                clusterIP: getServiceIP("syncthing-relay"),
                selector: { app: "syncthing-relay" },
                ports: [
                    { port: 22067, targetPort: 22067, name: "relay" },
                ],
            },
        },
        { provider, dependsOn: [deployment] }
    );

    // NodePort Service for external relay access (port 30001)
    const syncService = new k8s.core.v1.Service(
        "syncthing-relay-sync",
        {
            metadata: {
                name: "syncthing-relay-sync",
                namespace: ns.metadata.name,
            },
            spec: {
                type: "NodePort",
                selector: { app: "syncthing-relay" },
                ports: [
                    { port: 22067, targetPort: 22067, nodePort: 30001, name: "relay" },
                ],
            },
        },
        { provider, dependsOn: [deployment] }
    );

    return { deployment, service, syncService, pvc };
}
