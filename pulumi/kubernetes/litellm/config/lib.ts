export interface ModelVariant {
    nameSuffix: string;
    model: string;
    apiKeyEnvVar: string;
    apiBase?: string;
    timeout?: number;
    extraBody?: Record<string, any>;
}

export interface ModelGroup {
    baseName: string;
    title: string;
    variants: ModelVariant[];
}

export interface ProviderConfig {
    name: string;
    apiKeyEnvVar: string;
    modelTemplate: (model: string) => string;
    apiBase?: string;
}

export const providers: Record<string, ProviderConfig> = {
    zai: {
        name: "zai",
        apiKeyEnvVar: "ZAI_API_KEY",
        modelTemplate: (model) => `zai/${model}`,
        apiBase: "https://api.z.ai/api/coding/paas/v4"
    },
    nanogpt: {
        name: "nanogpt",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        modelTemplate: (model) => `openai/${model}`,
        apiBase: "https://nano-gpt.com/api/v1"
    },
    openrouter: {
        name: "openrouter",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        modelTemplate: (model) => `openrouter/${model}`
    }
};

export interface ModelVariantConfig {
    provider: string;
    nameSuffix: string;
    modelOverride?: string;
    timeout?: number;
    extraBody?: Record<string, any>;
}

export interface ModelGroupConfig {
    baseName: string;
    title: string;
    variants: ModelVariantConfig[];
}

export function createModelGroup(config: ModelGroupConfig): ModelGroup {
    const { baseName, title, variants } = config;

    const builtVariants: ModelVariant[] = variants.map(variantConfig => {
        const providerDef = providers[variantConfig.provider];
        if (!providerDef) {
            throw new Error(`Unknown provider: ${variantConfig.provider}`);
        }

        const modelString = providerDef.modelTemplate(variantConfig.modelOverride ?? baseName);

        const variant: ModelVariant = {
            nameSuffix: variantConfig.nameSuffix,
            model: modelString,
            apiKeyEnvVar: providerDef.apiKeyEnvVar,
            apiBase: providerDef.apiBase,
        };

        if (variantConfig.timeout) {
            variant.timeout = variantConfig.timeout;
        }

        if (variantConfig.extraBody) {
            variant.extraBody = variantConfig.extraBody;
        }

        return variant;
    });

    return {
        baseName,
        title,
        variants: builtVariants
    };
}
