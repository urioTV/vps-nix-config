import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

export interface LiteLLMZeroTrustConfig {
    accountId: string;
    domainName: string;
    adminEmail: string;
    provider: cloudflare.Provider;
}

export interface LiteLLMZeroTrustOutputs {
    applicationId: pulumi.Output<string>;
}

export function createLiteLLMZeroTrust(config: LiteLLMZeroTrustConfig): LiteLLMZeroTrustOutputs {
    const opts = { provider: config.provider };

    const uiPolicy = new cloudflare.ZeroTrustAccessPolicy("litellm-ui-policy", {
        accountId: config.accountId,
        name: "LiteLLM UI Access",
        decision: "non_identity",
        includes: [
            { anyValidServiceToken: {} },
        ],
    }, opts);

    const application = new cloudflare.ZeroTrustAccessApplication("litellm-app", {
        accountId: config.accountId,
        name: "LiteLLM",
        domain: config.domainName,
        type: "self_hosted",
        sessionDuration: "24h",
        policies: [{ id: uiPolicy.id }],
    }, opts);

    return {
        applicationId: application.id,
    };
}
