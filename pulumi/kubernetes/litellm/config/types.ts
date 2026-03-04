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
