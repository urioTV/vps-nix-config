import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import * as images from "../image-versions-manifest.json";

export interface EngramConfig {
    namespace: k8s.core.v1.Namespace;
}

/** Deploy Engram Cloud sync/dashboard and its private PostgreSQL database. */
export function deployEngram(config: EngramConfig, provider: k8s.Provider) {
    const ns = config.namespace.metadata.name!;
    const opts = { provider, dependsOn: [config.namespace] };

    const dbPassword = new random.RandomPassword("engram-postgres-password", {
        length: 40,
        special: false,
    });
    const cloudToken = new random.RandomPassword("engram-cloud-token", {
        length: 48,
        special: false,
    });
    const cloudAdmin = new random.RandomPassword("engram-cloud-admin", {
        length: 48,
        special: false,
    });
    // Required for signed dashboard sessions.
    const jwtSecret = new random.RandomPassword("engram-jwt-secret", {
        length: 64,
        special: false,
    });

    const secret = new k8s.core.v1.Secret("engram-cloud-env", {
        metadata: { name: "engram-cloud-env", namespace: ns },
        stringData: {
            POSTGRES_PASSWORD: dbPassword.result,
            ENGRAM_DATABASE_URL: pulumi.interpolate`postgres://engram:${dbPassword.result}@engram-postgres:5432/engram_cloud?sslmode=disable`,
            ENGRAM_JWT_SECRET: jwtSecret.result,
            ENGRAM_CLOUD_TOKEN: cloudToken.result,
            ENGRAM_CLOUD_ADMIN: cloudAdmin.result,
        },
    }, { ...opts, additionalSecretOutputs: ["data", "stringData"] });

    const configMap = new k8s.core.v1.ConfigMap("engram-cloud-config", {
        metadata: { name: "engram-cloud-config", namespace: ns },
        data: {
            ENGRAM_CLOUD_ALLOWED_PROJECTS: "*",
            ENGRAM_CLOUD_HOST: "0.0.0.0",
            ENGRAM_PORT: "18080",
            // Authenticated mode: tokens are supplied through the Secret.
        },
    }, opts);

    const dbPvc = new k8s.core.v1.PersistentVolumeClaim("engram-postgres-pvc", {
        metadata: { name: "engram-postgres-pvc", namespace: ns },
        spec: {
            accessModes: ["ReadWriteOnce"],
            storageClassName: "longhorn",
            resources: { requests: { storage: "20Gi" } },
        },
    }, { ...opts, protect: true });

    const postgres = new k8s.apps.v1.StatefulSet("engram-postgres", {
        metadata: { name: "engram-postgres", namespace: ns },
        spec: {
            serviceName: "engram-postgres",
            replicas: 1,
            selector: { matchLabels: { app: "engram-postgres" } },
            template: {
                metadata: { labels: { app: "engram-postgres" } },
                spec: {
                    containers: [{
                        name: "postgres",
                        image: `${images.engramPostgres.image}:${images.engramPostgres.tag}`,
                        ports: [{ containerPort: 5432 }],
                        env: [
                            { name: "POSTGRES_DB", value: "engram_cloud" },
                            { name: "POSTGRES_USER", value: "engram" },
                            { name: "POSTGRES_PASSWORD", valueFrom: { secretKeyRef: { name: "engram-cloud-env", key: "POSTGRES_PASSWORD" } } },
                            { name: "PGDATA", value: "/var/lib/postgresql/data/pgdata" },
                        ],
                        volumeMounts: [{ name: "data", mountPath: "/var/lib/postgresql/data" }],
                        readinessProbe: { exec: { command: ["sh", "-c", "pg_isready -U engram -d engram_cloud"] }, initialDelaySeconds: 5, periodSeconds: 5 },
                        resources: { requests: { cpu: "250m", memory: "512Mi" }, limits: { memory: "2Gi" } },
                    }],
                    volumes: [{ name: "data", persistentVolumeClaim: { claimName: "engram-postgres-pvc" } }],
                },
            },
        },
    }, { ...opts, dependsOn: [config.namespace, secret, dbPvc] });

    const postgresService = new k8s.core.v1.Service("engram-postgres-service", {
        metadata: { name: "engram-postgres", namespace: ns },
        spec: { selector: { app: "engram-postgres" }, ports: [{ port: 5432, targetPort: 5432 }] },
    }, { ...opts, dependsOn: [postgres] });

    const cloud = new k8s.apps.v1.Deployment("engram-cloud", {
        metadata: { name: "engram-cloud", namespace: ns },
        spec: {
            replicas: 1,
            selector: { matchLabels: { app: "engram-cloud" } },
            template: {
                metadata: {
                    labels: { app: "engram-cloud" },
                    // envFrom is read only at startup; roll pods when config changes.
                    annotations: {
                        "engram/config-version": configMap.metadata.resourceVersion,
                        "engram/secret-version": secret.metadata.resourceVersion,
                    },
                },
                spec: {
                    containers: [{
                        name: "cloud",
                        image: `${images.engram.image}:${images.engram.tag}`,
                        ports: [{ containerPort: 18080 }],
                        envFrom: [
                            { secretRef: { name: "engram-cloud-env" } },
                            { configMapRef: { name: "engram-cloud-config" } },
                        ],
                        readinessProbe: { httpGet: { path: "/health", port: 18080 }, initialDelaySeconds: 10, periodSeconds: 10 },
                        livenessProbe: { httpGet: { path: "/health", port: 18080 }, initialDelaySeconds: 30, periodSeconds: 20 },
                        resources: { requests: { cpu: "100m", memory: "128Mi" }, limits: { memory: "512Mi" } },
                    }],
                },
            },
        },
    }, { ...opts, dependsOn: [secret, configMap, postgresService] });

    const cloudService = new k8s.core.v1.Service("engram-cloud-service", {
        metadata: { name: "engram-cloud", namespace: ns },
        // Only the Cloudflare Tunnel reaches the internal API.
        spec: {
            selector: { app: "engram-cloud" },
            type: "ClusterIP",
            ports: [{ port: 18080, targetPort: 18080 }],
        },
    }, { ...opts, dependsOn: [cloud] });

    // Keep the historical resource name to update the existing policy in place.
    // Only the shared cloudflared workload may reach the API.
    const netbirdOnly = new k8s.networking.v1.NetworkPolicy("engram-netbird-only", {
        metadata: { name: "engram-netbird-only", namespace: ns },
        spec: {
            podSelector: { matchLabels: { app: "engram-cloud" } },
            policyTypes: ["Ingress"],
            ingress: [{
                from: [{
                    namespaceSelector: { matchLabels: { "kubernetes.io/metadata.name": "aiostreams" } },
                    podSelector: { matchLabels: { app: "aiostreams-tunnel" } },
                }],
                ports: [{ protocol: "TCP", port: 18080 }],
            }],
        },
    }, { ...opts, dependsOn: [cloud] });

    return { cloud, cloudService, netbirdOnly, postgres, postgresService, dbPvc, cloudToken: cloudToken.result, cloudAdmin: cloudAdmin.result };
}
