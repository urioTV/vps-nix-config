import * as k8s from "@pulumi/kubernetes";
import * as images from "../image-versions-manifest.json";
import { getServiceIP } from "./networking";

export interface SyncthingConfig {
    namespace: k8s.core.v1.Namespace;
}

/**
 * Deploy Syncthing for file synchronization
 * GUI: 8384, Sync: 22000 (TCP/UDP)
 */
export function deploySyncthing(config: SyncthingConfig, provider: k8s.Provider) {
    const ns = config.namespace.metadata.name;

    // PVC using Longhorn for data persistence
    const pvc = new k8s.core.v1.PersistentVolumeClaim(
        "syncthing-pvc",
        {
            metadata: {
                name: "syncthing-pvc",
                namespace: ns,
            },
            spec: {
                accessModes: ["ReadWriteOnce"],
                storageClassName: "longhorn",
                resources: {
                    requests: { storage: "50Gi" },
                },
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    // Deployment
    const deployment = new k8s.apps.v1.Deployment(
        "syncthing",
        {
            metadata: {
                name: "syncthing",
                namespace: ns,
            },
            spec: {
                selector: { matchLabels: { app: "syncthing" } },
                template: {
                    metadata: { labels: { app: "syncthing" } },
                    spec: {
                        containers: [
                            {
                                name: "syncthing",
                                image: `${images.syncthing.image}:${images.syncthing.tag}`,
                                ports: [
                                    { containerPort: 8384, name: "gui" },
                                    { containerPort: 22000, name: "sync-tcp" },
                                    { containerPort: 22000, name: "sync-udp", protocol: "UDP" },
                                ],
                                env: [
                                    { name: "PUID", value: "1000" },
                                    { name: "PGID", value: "1000" },
                                ],
                                volumeMounts: [
                                    { name: "data", mountPath: "/var/syncthing" },
                                ],
                            },
                        ],
                        volumes: [
                            {
                                name: "data",
                                persistentVolumeClaim: { claimName: "syncthing-pvc" },
                            },
                        ],
                    },
                },
            },
        },
        { provider, dependsOn: [pvc] }
    );

    // ClusterIP Service for GUI (Tailscale access) with static IP
    const service = new k8s.core.v1.Service(
        "syncthing",
        {
            metadata: {
                name: "syncthing",
                namespace: ns,
            },
            spec: {
                type: "ClusterIP",
                clusterIP: getServiceIP("syncthing"),
                selector: { app: "syncthing" },
                ports: [
                    { port: 8384, targetPort: 8384, name: "gui" },
                    { port: 22000, targetPort: 22000, name: "sync-tcp" },
                    { port: 22000, targetPort: 22000, name: "sync-udp", protocol: "UDP" },
                ],
            },
        },
        { provider, dependsOn: [deployment] }
    );

    // NodePort Service for external sync access (port 30000)
    const syncService = new k8s.core.v1.Service(
        "syncthing-sync",
        {
            metadata: {
                name: "syncthing-sync",
                namespace: ns,
            },
            spec: {
                type: "NodePort",
                selector: { app: "syncthing" },
                ports: [
                    { port: 22000, targetPort: 22000, nodePort: 30000, name: "sync-tcp" },
                    { port: 22000, targetPort: 22000, nodePort: 30000, name: "sync-udp", protocol: "UDP" },
                ],
            },
        },
    );

    return { deployment, service, syncService, pvc };
}