import { ProviderConfig } from "./types";

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
