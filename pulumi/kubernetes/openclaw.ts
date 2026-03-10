import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as images from "../image-versions-manifest.json";
import { serviceIPs } from "./networking";



export interface OpenclawConfig {
  namespace: k8s.core.v1.Namespace;
  tunnelToken: pulumi.Output<string>;
  domain: string;
  zaiApiKey: string;
  nanogptApiKey: string;
  openrouterApiKey: string;
  gatewayToken: string;
}

export interface OpenclawOutputs {
  openclawUrl: pulumi.Output<string>;
}

export function deployOpenclaw(
  config: OpenclawConfig,
  provider: k8s.Provider
): OpenclawOutputs {
  const ns = config.namespace.metadata.name;

  // 1. Helm Release — operator (CRD + controller)
  const operatorRelease = new k8s.helm.v3.Release("openclaw-operator", {
    chart: "oci://ghcr.io/openclaw-rocks/charts/openclaw-operator",
    version: images["openclaw-operator"].tag,
    name: "openclaw-operator",
    namespace: ns,
    createNamespace: false,
  }, { provider, dependsOn: config.namespace });

  // 2. K8s Secret with LLM provider API keys
  const apiKeysSecret = new k8s.core.v1.Secret("openclaw-api-keys", {
    metadata: { name: "openclaw-api-keys", namespace: ns },
    stringData: {
      ZAI_API_KEY: config.zaiApiKey,
      NANOGPT_API_KEY: config.nanogptApiKey,
      OPENROUTER_API_KEY: config.openrouterApiKey,
      OPENCLAW_GATEWAY_TOKEN: config.gatewayToken,
    },
  }, { provider, dependsOn: [config.namespace] });

  // 3. OpenClawInstance CR — must depend on operatorRelease to avoid CRD race
  new k8s.apiextensions.CustomResource("openclaw-instance", {
    apiVersion: "openclaw.rocks/v1alpha1",
    kind: "OpenClawInstance",
    metadata: { name: "openclaw", namespace: ns },
    spec: {
      envFrom: [{ secretRef: { name: "openclaw-api-keys" } }],
      security: {
        networkPolicy: {
          additionalEgress: [
            {
              ports: [{ port: 3000, protocol: "TCP" }],
              to: [
                {
                  namespaceSelector: {
                    matchLabels: { "kubernetes.io/metadata.name": "perplexica" },
                  },
                },
              ],
            },
          ],
        },
      },
      config: {
        mergeMode: "merge",
        raw: {
          gateway: {
            auth: {
              mode: "trusted-proxy",
              token: "${OPENCLAW_GATEWAY_TOKEN}",
              trustedProxy: {
                userHeader: "Cf-Access-Authenticated-User-Email",
                requiredHeaders: ["Cf-Access-Jwt-Assertion"],
              },
            },
            controlUi: {
              allowedOrigins: [`https://${config.domain}`],
            },
            trustedProxies: ["10.42.0.0/16"],
          },
          models: {
            providers: {
              zai: {
                api: "openai-completions",
                baseUrl: "https://api.z.ai/api/coding/paas/v4",
                apiKey: "${ZAI_API_KEY}",
                models: [
                  { id: "glm-5", name: "GLM-5", contextWindow: 200000, reasoning: true },
                  { id: "glm-4.7", name: "GLM-4.7", contextWindow: 200000, reasoning: true },
                ],
              },
              nanogpt: {
                api: "openai-completions",
                baseUrl: "https://nano-gpt.com/api/v1",
                apiKey: "${NANOGPT_API_KEY}",
                models: [
                  { id: "glm-5", name: "GLM-5", contextWindow: 200000, reasoning: true },
                  { id: "glm-4.7", name: "GLM-4.7", contextWindow: 200000, reasoning: true },
                  { id: "qwen3.5-397b-a17b", name: "Qwen3.5 397B", contextWindow: 256000, reasoning: false },
                  { id: "qwen3.5-397b-a17b:thinking", name: "Qwen3.5 397B Thinking", contextWindow: 256000, reasoning: true },
                  { id: "qwen3.5-122b-a10b", name: "Qwen3.5 122B", contextWindow: 256000, reasoning: false },
                  { id: "qwen3.5-122b-a10b:thinking", name: "Qwen3.5 122B Thinking", contextWindow: 256000, reasoning: true },
                  { id: "qwen3.5-27b", name: "Qwen3.5 27B", contextWindow: 256000, reasoning: false },
                  { id: "qwen3.5-27b:thinking", name: "Qwen3.5 27B Thinking", contextWindow: 256000, reasoning: true },
                  { id: "minimax-m2.5", name: "MiniMax M2.5", contextWindow: 205000, reasoning: true },
                ],
              },
              openrouter: {
                api: "openai-completions",
                baseUrl: "https://openrouter.ai/api/v1",
                apiKey: "${OPENROUTER_API_KEY}",
                models: [
                  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", contextWindow: 1000000, reasoning: true },
                  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast", contextWindow: 2000000, reasoning: true },
                ],
              },
            },
          },
        },
      },
    },
  }, { provider, dependsOn: [operatorRelease, apiKeysSecret] });

  // 3. K8s Secret with tunnel token
  const tunnelSecret = new k8s.core.v1.Secret("openclaw-tunnel-secret", {
    metadata: { name: "openclaw-tunnel-secret", namespace: ns },
    stringData: { TUNNEL_TOKEN: config.tunnelToken },
  }, { provider, dependsOn: [config.namespace] });

  // 4. cloudflared Deployment (separate Deployment, not a sidecar)
  new k8s.apps.v1.Deployment("openclaw-tunnel", {
    metadata: { name: "openclaw-tunnel", namespace: ns },
    spec: {
      selector: { matchLabels: { app: "openclaw-tunnel" } },
      template: {
        metadata: { labels: { app: "openclaw-tunnel" } },
        spec: {
          containers: [
            {
              name: "cloudflared",
              image: `${images.cloudflared.image}:${images.cloudflared.tag}`,
              args: ["tunnel", "--no-autoupdate", "run"],
              env: [
                {
                  name: "TUNNEL_TOKEN",
                  valueFrom: {
                    secretKeyRef: {
                      name: "openclaw-tunnel-secret",
                      key: "TUNNEL_TOKEN",
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    },
  }, { provider, dependsOn: [tunnelSecret] });

  return {
    openclawUrl: pulumi.interpolate`http://${serviceIPs.openclaw}:18789`,
  };
}
