import { ModelVariant, ModelGroup, ModelGroupConfig } from "./types";
import { providers } from "./providers";

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

    return { baseName, title, variants: builtVariants };
}
