import * as k8s from "@pulumi/kubernetes";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import * as images from "../../image-versions-manifest.json";
import { getHostAliases, getServiceIP } from "../networking";

// INTEGRATION: Ensure secrets exist before deployment
// This runs at import time, ensuring secrets.yaml is populated before index.ts calls loadSecrets()
try {
    const ensureScript = path.join(__dirname, "ensure-secrets.sh");
    if (fs.existsSync(ensureScript)) {
        console.log("🔑 Running ensure-secrets.sh from jackett.ts...");
        execSync(ensureScript, { stdio: "inherit" });
    }
} catch (e) {
    console.error("⚠️ Failed to run ensure-secrets.sh:", e);
    // process.exit(1); // Optional: fail hard if secrets are critical
}

export interface JackettConfig {
    namespace: k8s.core.v1.Namespace;
    apiKey: string;
}

/**
 * Deploy Jackett for torrent indexer aggregation
 */
export function deployJackett(config: JackettConfig, provider: k8s.Provider) {
    const ns = config.namespace.metadata.name;

    // Load init script from external file
    const scriptPath = path.join(__dirname, "scripts/99-force-api-key.sh");
    const scriptContent = fs.readFileSync(scriptPath, "utf-8");

    // ConfigMap for init script to enforce API Key
    const initScriptConfig = new k8s.core.v1.ConfigMap(
        "jackett-init-script",
        {
            metadata: {
                name: "jackett-init-script",
                namespace: ns,
            },
            data: {
                "99-force-api-key.sh": scriptContent,
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

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
                        hostAliases: getHostAliases(["byparr"]),
                        containers: [
                            {
                                name: "jackett",
                                image: `${images.jackett.image}:${images.jackett.tag}`,
                                ports: [{ containerPort: 9117 }],
                                env: [
                                    { name: "PUID", value: "1000" },
                                    { name: "PGID", value: "1000" },
                                    { name: "TZ", value: "Europe/Warsaw" },
                                    { name: "JACKETT_API_KEY", value: config.apiKey },
                                ],
                                volumeMounts: [
                                    { name: "config", mountPath: "/config" },
                                    {
                                        name: "init-script",
                                        mountPath: "/custom-cont-init.d/99-force-api-key.sh",
                                        subPath: "99-force-api-key.sh",
                                    },
                                ],
                            },
                        ],
                        volumes: [
                            {
                                name: "config",
                                persistentVolumeClaim: { claimName: "jackett-config" },
                            },
                            {
                                name: "init-script",
                                configMap: {
                                    name: "jackett-init-script",
                                    defaultMode: 0o755,
                                },
                            },
                        ],
                    },
                },
            },
        },
        { provider, dependsOn: [config.namespace, initScriptConfig] }
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
                clusterIP: getServiceIP("jackett"),
                ports: [{ name: "http", port: 80, targetPort: 9117 }],
            },
        },
        { provider, dependsOn: [deployment] }
    );

    return { deployment, service, pvc };
}
