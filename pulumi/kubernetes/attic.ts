import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as images from "../image-versions-manifest.json";

export interface AtticConfig {
    namespace: k8s.core.v1.Namespace;
    /** Base64-encoded RSA PKCS#1 private key that signs access tokens (openssl genrsa -traditional 4096 | base64 -w0). */
    rs256SecretBase64: string;
}

/** Hostname served through the shared Cloudflare Tunnel. */
export const ATTIC_DOMAIN = "attic.urio.dev";

/**
 * Private Nix binary cache (attic) with a hard storage ceiling.
 *
 * The cache is private: no cache is created as public, so every pull and push
 * needs a JWT issued with `atticadm make-token`. Storage is a 20 GiB Longhorn
 * volume, so the ceiling is enforced by the volume itself.
 */
export function deployAttic(config: AtticConfig, provider: k8s.Provider) {
    const ns = config.namespace.metadata.name!;
    const opts = { provider, dependsOn: [config.namespace] };
    const image = `${images.attic.image}:${images.attic.tag}`;

    const secret = new k8s.core.v1.Secret("attic-server-env", {
        metadata: { name: "attic-server-env", namespace: ns },
        stringData: {
            ATTIC_SERVER_TOKEN_RS256_SECRET_BASE64: config.rs256SecretBase64,
        },
    }, { ...opts, additionalSecretOutputs: ["data", "stringData"] });

    // Server settings. Secrets come from the environment, not from this file.
    // Storage and database live on one volume (/data), so the 20 GiB PVC caps everything.
    const serverToml = [
        'listen = "[::]:8080"',
        `allowed-hosts = ["${ATTIC_DOMAIN}"]`,
        `api-endpoint = "https://${ATTIC_DOMAIN}/"`,
        "require-proof-of-possession = true",
        "",
        "[database]",
        'url = "sqlite:///data/server.db?mode=rwc"',
        "",
        "[storage]",
        'type = "local"',
        'path = "/data/storage"',
        "",
        "[chunking]",
        "nar-size-threshold = 65536",
        "min-size = 16384",
        "avg-size = 65536",
        "max-size = 262144",
        "",
        "[compression]",
        // zstd 12: ~11x faster than 19 at ~11% larger output. Level 19 ran at
        // ~4 MB/s per thread, so multi-GB NARs timed out during upload.
        'type = "zstd"',
        "level = 12",
        "",
        "[garbage-collection]",
        // Keeps the volume below its ceiling by evicting cold objects.
        'interval = "12 hours"',
        'default-retention-period = "90 days"',
        "",
        "[jwt]",
        "",
    ].join("\n");

    const configMap = new k8s.core.v1.ConfigMap("attic-server-config", {
        metadata: { name: "attic-server-config", namespace: ns },
        data: { "server.toml": serverToml },
    }, opts);

    const dataPvc = new k8s.core.v1.PersistentVolumeClaim("attic-data-pvc", {
        metadata: { name: "attic-data-pvc", namespace: ns },
        spec: {
            accessModes: ["ReadWriteOnce"],
            storageClassName: "longhorn",
            resources: { requests: { storage: "20Gi" } },
        },
    }, { ...opts, protect: true });

    const server = new k8s.apps.v1.Deployment("attic-server", {
        metadata: { name: "attic-server", namespace: ns },
        spec: {
            replicas: 1,
            // Single writer on a ReadWriteOnce volume with SQLite: no overlapping pods.
            strategy: { type: "Recreate" },
            selector: { matchLabels: { app: "attic-server" } },
            template: {
                metadata: {
                    labels: { app: "attic-server" },
                    annotations: {
                        "attic/config-version": configMap.metadata.resourceVersion,
                        "attic/secret-version": secret.metadata.resourceVersion,
                    },
                },
                spec: {
                    securityContext: { fsGroup: 1000 },
                    containers: [{
                        name: "attic",
                        image,
                        args: ["-f", "/etc/attic/server.toml", "--mode", "monolithic"],
                        ports: [{ containerPort: 8080 }],
                        env: [{
                            name: "ATTIC_SERVER_TOKEN_RS256_SECRET_BASE64",
                            valueFrom: { secretKeyRef: { name: "attic-server-env", key: "ATTIC_SERVER_TOKEN_RS256_SECRET_BASE64" } },
                        }],
                        volumeMounts: [
                            { name: "config", mountPath: "/etc/attic", readOnly: true },
                            { name: "data", mountPath: "/data" },
                        ],
                        readinessProbe: { tcpSocket: { port: 8080 }, initialDelaySeconds: 5, periodSeconds: 10 },
                        livenessProbe: { tcpSocket: { port: 8080 }, initialDelaySeconds: 30, periodSeconds: 20 },
                        // 2Gi was OOMKilled while compressing large NARs at zstd level 19.
                        resources: { requests: { cpu: "100m", memory: "1Gi" }, limits: { memory: "4Gi" } },
                    }],
                    volumes: [
                        { name: "config", configMap: { name: "attic-server-config" } },
                        { name: "data", persistentVolumeClaim: { claimName: "attic-data-pvc" } },
                    ],
                },
            },
        },
    }, { ...opts, dependsOn: [secret, configMap, dataPvc] });

    const service = new k8s.core.v1.Service("attic-server-service", {
        metadata: { name: "attic-server", namespace: ns },
        // Only the Cloudflare Tunnel reaches the API (see NetworkPolicy below).
        spec: {
            selector: { app: "attic-server" },
            type: "ClusterIP",
            ports: [{ port: 8080, targetPort: 8080 }],
        },
    }, { ...opts, dependsOn: [server] });

    // Public HTTPS through Traefik (DNS-only record, no Cloudflare proxy).
    // Cloudflare's proxy caps request bodies at 100 MB on Free, which breaks NAR uploads.
    // Access is gated by JWT tokens, so there is no separate network-level allowlist here.
    const certificate = new k8s.apiextensions.CustomResource("attic-certificate", {
        apiVersion: "cert-manager.io/v1",
        kind: "Certificate",
        metadata: { name: "attic-tls", namespace: ns },
        spec: {
            secretName: "attic-tls",
            issuerRef: { name: "letsencrypt-cloudflare", kind: "ClusterIssuer" },
            dnsNames: [ATTIC_DOMAIN],
        },
    }, { ...opts });

    const ingressRoute = new k8s.apiextensions.CustomResource("attic-ingressroute", {
        apiVersion: "traefik.io/v1alpha1",
        kind: "IngressRoute",
        metadata: { name: "attic-server", namespace: ns },
        spec: {
            entryPoints: ["websecure"],
            routes: [{
                match: `Host(\`${ATTIC_DOMAIN}\`)`,
                kind: "Rule",
                services: [{ name: "attic-server", port: 8080, scheme: "http" }],
            }],
            tls: { secretName: "attic-tls" },
        },
    }, { ...opts, dependsOn: [service, certificate] });

    return { server, service, ingressRoute, dataPvc: dataPvc.metadata.name, serviceUrl: pulumi.interpolate`http://${service.metadata.name}.${ns}:8080` };
}
