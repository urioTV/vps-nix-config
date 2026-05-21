import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import * as k8s from "@pulumi/kubernetes";
import { loadSecrets } from "./lib/sops";
import { createTunnel, createAiostreamsZeroTrust } from "./cloudflare";
import { createNamespaces, deployAiometadata, deployAiostreams, deployJackett, deployByparr, deployMinio, deployCalico, deploySyncthing, deploySyncthingRelay, deployCertManager, deploySyncthingDiscovery } from "./kubernetes";

// ============================================================================
// Configuration
// ============================================================================

const config = new pulumi.Config();
const kubeconfigPath = config.get("kubeconfigPath") || "../kubeconfig";

// Load SOPS-encrypted secrets from root secrets/ folder
const secrets = loadSecrets();

// ============================================================================
// Providers
// ============================================================================

// Cloudflare provider
const cloudflareProvider = new cloudflare.Provider("cloudflare", {
    apiToken: secrets.cloudflare_api_token,
});

// Kubernetes provider
const k8sProvider = new k8s.Provider("k8s", {
    kubeconfig: kubeconfigPath,
});

// ============================================================================
// Cloudflare Resources
// ============================================================================

// Create Cloudflare Tunnel
const tunnel = createTunnel({
    accountId: secrets.cloudflare_account_id,
    zoneId: secrets.cloudflare_zone_id,
    tunnelName: "aiostreams-k8s-v2",
    domainName: secrets.aiostreams_domain,
    dnsRecordName: "aiostreams",
    serviceUrl: "http://aiostreams:3000",
    provider: cloudflareProvider,
});

// Create Zero Trust Access policies and applications
createAiostreamsZeroTrust({
    accountId: secrets.cloudflare_account_id,
    domainName: secrets.aiostreams_domain,
    adminEmail: secrets.aiostreams_admin_email,
    provider: cloudflareProvider,
});


// ============================================================================
// Kubernetes Resources
// ============================================================================

// NOTE: Longhorn already installed via existing Helm release, skipping Pulumi management
// const longhorn = deployLonghorn(k8sProvider);

// Deploy Calico CNI
deployCalico(k8sProvider);

// Create namespaces
const namespaces = createNamespaces(k8sProvider);

// Deploy MinIO
deployMinio(
    {
        namespace: namespaces.minio,
        rootUser: secrets.minio_root_user,
        rootPassword: secrets.minio_root_password,
    },
    k8sProvider
);

// Deploy AIOMetadata
deployAiometadata(
    { namespace: namespaces.aiometadata },
    k8sProvider
);

// Deploy AIOStreams with Cloudflare Tunnel
deployAiostreams(
    {
        namespace: namespaces.aiostreams,
        tunnelToken: tunnel.tunnelToken,
        secretKey: secrets.aiostreams_secret_key,
        domain: secrets.aiostreams_domain,
    },
    k8sProvider
);

// Deploy Jackett
deployJackett(
    {
        namespace: namespaces.jackett,
        apiKey: secrets.jackett_api_key,
    },
    k8sProvider
);

// Deploy Byparr (modern FlareSolverr alternative)
deployByparr(
    { namespace: namespaces.byparr },
    k8sProvider
);

// Deploy Syncthing
deploySyncthing(
    { namespace: namespaces.syncthing },
    k8sProvider
);
// Deploy Syncthing Relay
deploySyncthingRelay(
    { namespace: namespaces["syncthing-relay"] },
    k8sProvider
);

// Deploy cert-manager with Cloudflare DNS-01 ClusterIssuer
deployCertManager(
    {
        namespace: namespaces["cert-manager"],
        cloudflareApiToken: secrets.cloudflare_api_token,
        cloudflareEmail: secrets.aiostreams_admin_email,
    },
    k8sProvider
);

// Deploy Syncthing Discovery Server (HTTPS via cert-manager)
deploySyncthingDiscovery(
    {
        namespace: namespaces.syncthing,
        domain: secrets.syncthing_discovery_domain,
    },
    k8sProvider
);
// ============================================================================
// Exports
// ============================================================================

export const tunnelId = tunnel.tunnelId;
export const tunnelToken = pulumi.secret(tunnel.tunnelToken);
export const aiostreamsUrl = `https://${secrets.aiostreams_domain}`;
export const syncthingDiscoveryUrl = `https://${secrets.syncthing_discovery_domain}`;


