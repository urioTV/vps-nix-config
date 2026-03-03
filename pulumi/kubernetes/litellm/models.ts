export interface ModelConfig {
    name: string;
    provider: string;
    model: string;
    apiKeyEnvVar: string;
    priority?: number;
}

export const models: ModelConfig[] = [
    // GLM-5 - Fallback: GLM Coding Plan > OpenRouter
    {
        name: "glm-5",
        provider: "zai",
        model: "zai/glm-5",
        apiKeyEnvVar: "ZAI_API_KEY",
        priority: 1,
    },
    {
        name: "glm-5",
        provider: "openrouter",
        model: "openrouter/z-ai/glm-5",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // GLM-4.7 - Fallback: GLM Coding Plan > OpenRouter
    {
        name: "glm-4.7",
        provider: "zai",
        model: "zai/glm-4.7",
        apiKeyEnvVar: "ZAI_API_KEY",
        priority: 1,
    },
    {
        name: "glm-4.7",
        provider: "openrouter",
        model: "openrouter/z-ai/glm-4.7",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // GLM-4.7-flash - OpenRouter only
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
