import * as k8s from "@pulumi/kubernetes";
import { getServiceIP } from "./networking";

export interface SyncthingDiscoveryConfig {
    namespace: k8s.core.v1.Namespace;
    domain: string;
}

/**
 * Deploy Syncthing Discovery Server (stdiscosrv)
 * 
 * Requires mTLS - clients must present certificate for POST (announce)
 * Uses Traefik IngressRoute with:
 * - TLSOption for client auth
 * - Middleware to pass client cert to backend
 */
export function deploySyncthingDiscovery(
    config: SyncthingDiscoveryConfig,
    provider: k8s.Provider
) {
    const ns = config.namespace.metadata.name;

    // TLSOption for mTLS - require client certificate
    const tlsOption = new k8s.apiextensions.CustomResource(
        "syncthing-discovery-tls-option",
        {
            apiVersion: "traefik.io/v1alpha1",
            kind: "TLSOption",
            metadata: {
                name: "syncthing-discovery-mtls",
                namespace: ns,
            },
            spec: {
                clientAuth: {
                    clientAuthType: "RequireAnyClientCert",
                },
            },
        },
        { provider }
    );

    // Middleware to pass client certificate to backend
    const middleware = new k8s.apiextensions.CustomResource(
        "syncthing-discovery-middleware",
        {
            apiVersion: "traefik.io/v1alpha1",
            kind: "Middleware",
            metadata: {
                name: "syncthing-discovery-passtls",
                namespace: ns,
            },
            spec: {
                passTLSClientCert: {
                    pem: true,
                },
            },
        },
        { provider }
    );

    // Deployment
    const deployment = new k8s.apps.v1.Deployment(
        "syncthing-discovery",
        {
            metadata: {
                name: "syncthing-discovery",
                namespace: ns,
                labels: { app: "syncthing-discovery" },
            },
            spec: {
                selector: { matchLabels: { app: "syncthing-discovery" } },
                template: {
                    metadata: { labels: { app: "syncthing-discovery" } },
                    spec: {
                        containers: [
                            {
                                name: "discovery",
                                image: "ghcr.io/syncthing/discosrv:latest",
                                ports: [
                                    { containerPort: 8443, name: "https" },
                                ],
                                args: [
                                    "--http",
                                    "--listen=:8443",
                                    "--db-dir=/var/stdiscosrv",
                                ],
                                resources: {
                                    requests: { memory: "64Mi", cpu: "50m" },
                                    limits: { memory: "256Mi", cpu: "200m" },
                                },
                            },
                        ],
                        volumes: [
                            {
                                name: "data",
                                emptyDir: {},
                            },
                        ],
                    },
                },
            },
        },
        { provider, dependsOn: [config.namespace] }
    );

    // ClusterIP Service with static IP
    const service = new k8s.core.v1.Service(
        "syncthing-discovery",
        {
            metadata: {
                name: "syncthing-discovery",
                namespace: ns,
                annotations: {
                    "traefik.ingress.kubernetes.io/service.serversscheme": "http",
                },
            },
            spec: {
                type: "ClusterIP",
                clusterIP: getServiceIP("syncthing-discovery"),
                selector: { app: "syncthing-discovery" },
                ports: [
                    { port: 8443, targetPort: 8443, name: "https" },
                ],
            },
        },
        { provider, dependsOn: [deployment] }
    );

    // Certificate (cert-manager)
    const certificate = new k8s.apiextensions.CustomResource(
        "syncthing-discovery-certificate",
        {
            apiVersion: "cert-manager.io/v1",
            kind: "Certificate",
            metadata: {
                name: "syncthing-discovery-tls",
                namespace: ns,
            },
            spec: {
                secretName: "syncthing-discovery-tls",
                issuerRef: {
                    name: "letsencrypt-cloudflare",
                    kind: "ClusterIssuer",
                },
                dnsNames: [config.domain],
            },
        },
        { provider }
    );

    // IngressRoute (Traefik CRD) with mTLS
    const ingressRoute = new k8s.apiextensions.CustomResource(
        "syncthing-discovery-ingressroute",
        {
            apiVersion: "traefik.io/v1alpha1",
            kind: "IngressRoute",
            metadata: {
                name: "syncthing-discovery",
                namespace: ns,
            },
            spec: {
                entryPoints: ["websecure"],
                routes: [
                    {
                        match: `Host(\`${config.domain}\`)`,
                        kind: "Rule",
                        services: [
                            {
                                name: "syncthing-discovery",
                                port: 8443,
                                scheme: "http",
                            },
                        ],
                        middlewares: [
                            { name: "syncthing-discovery-passtls", namespace: ns },
                        ],
                    },
                ],
                tls: {
                    secretName: "syncthing-discovery-tls",
                    options: {
                        name: "syncthing-discovery-mtls",
                        namespace: ns,
                    },
                },
            },
        },
        { provider, dependsOn: [service, tlsOption, middleware, certificate] }
    );

    return { deployment, service, tlsOption, middleware, ingressRoute };
}
