import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as images from "../image-versions-manifest.json";
import { serviceIPs } from "./networking";



export interface OpenclawConfig {
  namespace: k8s.core.v1.Namespace;
  tunnelToken: pulumi.Output<string>;
  domain: string;
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

  // 2. OpenClawInstance CR — must depend on operatorRelease to avoid CRD race
  new k8s.apiextensions.CustomResource("openclaw-instance", {
    apiVersion: "openclaw.rocks/v1alpha1",
    kind: "OpenClawInstance",
    metadata: { name: "openclaw", namespace: ns },
    spec: {
      config: {
        mergeMode: "merge",
        raw: {
          gateway: {
            controlUi: {
              allowedOrigins: [`https://${config.domain}`],
              dangerouslyDisableDeviceAuth: true,
              allowInsecureAuth: true,
            },
            trustedProxies: ["127.0.0.1"],
          },
        },
      },
      // intentionally no selfConfigure
    },
  }, { provider, dependsOn: [operatorRelease] });

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
