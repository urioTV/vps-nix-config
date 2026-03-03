export interface ModelConfig {
    name: string;
    provider: string;
    model: string;
    apiKeyEnvVar: string;
    priority?: number;
}

export const models: ModelConfig[] = [
    // GLM-5 - OpenRouter only (744B MoE, 203K context)
    {
        name: "glm-5",
        provider: "openrouter",
        model: "openrouter/z-ai/glm-5",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },

    // GLM-4.7 Series - OpenRouter only
    {
        name: "glm-4.7",
        provider: "openrouter",
        model: "openrouter/z-ai/glm-4.7",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "glm-4.7-flash",
        provider: "openrouter",
        model: "openrouter/z-ai/glm-4.7-flash",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },

    // Qwen3.5 Series - OpenRouter only
    {
        name: "qwen3.5-397b",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-397b-a17b",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "qwen3.5-122b",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-122b-a10b",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "qwen3.5-35b",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-35b-a3b",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "qwen3.5-27b",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-27b",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "qwen3.5-flash",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-flash-02-23",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "qwen3.5-plus",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-plus-02-15",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },

    // MiniMax M2.5 - OpenRouter only
    {
        name: "minimax-m2.5",
        provider: "openrouter",
        model: "openrouter/minimax/minimax-m2.5",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },

    // GLM-4-Plus - Fallback: GLM Coding Plan > OpenRouter
    {
        name: "glm-4-plus",
        provider: "glm",
        model: "glm-4-plus",
        apiKeyEnvVar: "GLM_API_KEY",
        priority: 1,
    },
    {
        name: "glm-4-plus",
        provider: "openrouter",
        model: "openrouter/z-ai/glm-4-32b",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // GLM-4-Flash - Fallback: GLM Coding Plan > OpenRouter
    {
        name: "glm-4-flash",
        provider: "glm",
        model: "glm-4-flash",
        apiKeyEnvVar: "GLM_API_KEY",
        priority: 1,
    },
    {
        name: "glm-4-flash",
        provider: "openrouter",
        model: "openrouter/z-ai/glm-4-32b",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // GLM-4-Air - Fallback: GLM Coding Plan > OpenRouter
    {
        name: "glm-4-air",
        provider: "glm",
        model: "glm-4-air",
        apiKeyEnvVar: "GLM_API_KEY",
        priority: 1,
    },
    {
        name: "glm-4-air",
        provider: "openrouter",
        model: "openrouter/z-ai/glm-4-32b",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // GLM-Z1-Airx - GLM Coding Plan only
    {
        name: "glm-z1-airx",
        provider: "glm",
        model: "glm-z1-airx",
        apiKeyEnvVar: "GLM_API_KEY",
    },

    // GLM-Z1-Flash - GLM Coding Plan only
    {
        name: "glm-z1-flash",
        provider: "glm",
        model: "glm-z1-flash",
        apiKeyEnvVar: "GLM_API_KEY",
    },
];

export function generateConfigYaml(): string {
    const modelList = models
        .map(
            (m) => `  - model_name: ${m.name}
    litellm_params:
      model: ${m.model}
      api_key: os.environ/${m.apiKeyEnvVar}`
        )
        .join("\n");

    return `model_list:
${modelList}

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL
`;
}
