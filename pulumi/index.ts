import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import * as k8s from "@pulumi/kubernetes";
import { loadSecrets } from "./lib/sops";
import { createTunnel, createAiostreamsZeroTrust, createGrafanaZeroTrust, createPerplexicaZeroTrust } from "./cloudflare";
import { createNamespaces, deployAiometadata, deployAiostreams, deployJackett, deployByparr, deployMinio, deployCalico, deployMonitoring, deployPerplexica, deploySyncthing, deploySyncthingRelay, deployCertManager, deploySyncthingDiscovery, deployCliProxyApi, CliProxyApiConfig, deployLiteLLMPostgres, deployLiteLLMProxy } from "./kubernetes";

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

// Create Cloudflare Tunnel for Grafana
const grafanaTunnel = createTunnel({
    accountId: secrets.cloudflare_account_id,
    zoneId: secrets.cloudflare_zone_id,
    tunnelName: "grafana-k8s",
    domainName: secrets.grafana_domain,
    dnsRecordName: secrets.grafana_domain.split(".")[0], // Assuming subdomain
    serviceUrl: "http://10.43.200.203:80", // Grafana static ClusterIP (from networking.ts)
    provider: cloudflareProvider,
});

// Create Zero Trust Access for Grafana
createGrafanaZeroTrust({
    accountId: secrets.cloudflare_account_id,
    domainName: secrets.grafana_domain,
    adminEmail: secrets.aiostreams_admin_email,
    provider: cloudflareProvider,
});

// Create Cloudflare Tunnel for Perplexica
const perplexicaTunnel = createTunnel({
    accountId: secrets.cloudflare_account_id,
    zoneId: secrets.cloudflare_zone_id,
    tunnelName: "perplexica-k8s",
    domainName: secrets.perplexica_domain,
    dnsRecordName: secrets.perplexica_domain.split(".")[0],
    serviceUrl: "http://perplexica.perplexica:3000",
    provider: cloudflareProvider,
});

// Create Zero Trust Access for Perplexica
createPerplexicaZeroTrust({
    accountId: secrets.cloudflare_account_id,
    domainName: secrets.perplexica_domain,
    adminEmail: secrets.perplexica_admin_email,
    provider: cloudflareProvider,
});


// Create Cloudflare Tunnel for LiteLLM
const litellmTunnel = createTunnel({
    accountId: secrets.cloudflare_account_id,
    zoneId: secrets.cloudflare_zone_id,
    tunnelName: "litellm-k8s",
    domainName: secrets.litellm_domain,
    dnsRecordName: secrets.litellm_domain.split(".")[0],
    serviceUrl: "http://litellm.litellm.svc.cluster.local:4000",
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

// Deploy Monitoring Stack (Prometheus + Grafana)
const monitoringOps = deployMonitoring(
    {
        namespace: namespaces.monitoring,
        grafanaPassword: secrets.grafana_admin_password,
        tunnelToken: grafanaTunnel.tunnelToken,
        domain: secrets.grafana_domain,
    },
    k8sProvider
);

deployPerplexica(
    {
        namespace: namespaces.perplexica,
        tunnelToken: perplexicaTunnel.tunnelToken,
        domain: secrets.perplexica_domain,
    },
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

// Deploy CLIProxyAPIPlus
deployCliProxyApi(
    { namespace: namespaces["cli-proxy-api"] },
    k8sProvider
);



// Deploy LiteLLM Postgres
deployLiteLLMPostgres(
    {
        namespace: namespaces.litellm,
        postgresPassword: secrets.litellm_postgres_password,
    },
    k8sProvider
);

// Deploy LiteLLM Proxy
deployLiteLLMProxy(
    {
        namespace: namespaces.litellm,
        tunnelToken: litellmTunnel.tunnelToken,
        postgresServiceName: "litellm-postgres", // Name matches what is deployed in postgres.ts
        apiKeys: {
            zai: secrets.zai_api_key,
            nanogpt: secrets.nanogpt_api_key,
            openrouter: secrets.openrouter_api_key,
        },
    },
    k8sProvider,
    secrets.litellm_master_key,
    secrets.litellm_salt_key,
    secrets.litellm_postgres_password
);





// ============================================================================
// Exports
// ============================================================================

export const tunnelId = tunnel.tunnelId;
export const tunnelToken = pulumi.secret(tunnel.tunnelToken);
export const aiostreamsUrl = `https://${secrets.aiostreams_domain}`;
export const grafanaUrl = monitoringOps.grafanaUrl;
export const perplexicaUrl = `https://${secrets.perplexica_domain}`;
export const syncthingDiscoveryUrl = `https://${secrets.syncthing_discovery_domain}`;
export const litellmUrl = `https://${secrets.litellm_domain}`;


