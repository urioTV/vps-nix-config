export interface ModelConfig {
    name: string;
    provider: string;
    model: string;
    apiKeyEnvVar: string;
    priority?: number;
}

export const models: ModelConfig[] = [
    // GLM-5 - Fallback: GLM Coding Plan > Nano-GPT > OpenRouter
    {
        name: "glm-5",
        provider: "zai",
        model: "zai/glm-5",
        apiKeyEnvVar: "ZAI_API_KEY",
        priority: 1,
    },
    {
        name: "glm-5",
        provider: "nanogpt",
        model: "nanogpt/glm-5",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 2,
    },
    {
        name: "glm-5",
        provider: "openrouter",
        model: "openrouter/z-ai/glm-5",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 3,
    },

    // GLM-4.7 - Fallback: GLM Coding Plan > Nano-GPT > OpenRouter
    {
        name: "glm-4.7",
        provider: "zai",
        model: "zai/glm-4.7",
        apiKeyEnvVar: "ZAI_API_KEY",
        priority: 1,
    },
    {
        name: "glm-4.7",
        provider: "nanogpt",
        model: "nanogpt/glm-4.7",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 2,
    },
    {
        name: "glm-4.7",
        provider: "openrouter",
        model: "openrouter/z-ai/glm-4.7",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 3,
    },

    // GLM-4.7-flash - Fallback: Nano-GPT > OpenRouter
    {
        name: "glm-4.7-flash",
        provider: "nanogpt",
        model: "nanogpt/glm-4.7-flash",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 1,
    },
    {
        name: "glm-4.7-flash",
        provider: "openrouter",
        model: "openrouter/z-ai/glm-4.7-flash",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // Qwen3.5-397b - Fallback: Nano-GPT > OpenRouter
    {
        name: "qwen3.5-397b",
        provider: "nanogpt",
        model: "nanogpt/qwen3.5-397b-a17b",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 1,
    },
    {
        name: "qwen3.5-397b",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-397b-a17b",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // Qwen3.5-397b-thinking - Fallback: Nano-GPT > OpenRouter
    {
        name: "qwen3.5-397b-thinking",
        provider: "nanogpt",
        model: "nanogpt/qwen3.5-397b-a17b:thinking",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 1,
    },
    {
        name: "qwen3.5-397b-thinking",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-397b-a17b:thinking",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // Qwen3.5-122b - Fallback: Nano-GPT > OpenRouter
    {
        name: "qwen3.5-122b",
        provider: "nanogpt",
        model: "nanogpt/qwen3.5-122b-a10b",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 1,
    },
    {
        name: "qwen3.5-122b",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-122b-a10b",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // Qwen3.5-122b-thinking - Fallback: Nano-GPT > OpenRouter
    {
        name: "qwen3.5-122b-thinking",
        provider: "nanogpt",
        model: "nanogpt/qwen3.5-122b-a10b:thinking",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 1,
    },
    {
        name: "qwen3.5-122b-thinking",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-122b-a10b:thinking",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // Qwen3.5-35b - Fallback: Nano-GPT > OpenRouter
    {
        name: "qwen3.5-35b",
        provider: "nanogpt",
        model: "nanogpt/qwen3.5-35b-a3b",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 1,
    },
    {
        name: "qwen3.5-35b",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-35b-a3b",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // Qwen3.5-35b-thinking - Fallback: Nano-GPT > OpenRouter
    {
        name: "qwen3.5-35b-thinking",
        provider: "nanogpt",
        model: "nanogpt/qwen3.5-35b-a3b:thinking",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 1,
    },
    {
        name: "qwen3.5-35b-thinking",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-35b-a3b:thinking",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // Qwen3.5-27b - Fallback: Nano-GPT > OpenRouter
    {
        name: "qwen3.5-27b",
        provider: "nanogpt",
        model: "nanogpt/qwen3.5-27b",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 1,
    },
    {
        name: "qwen3.5-27b",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-27b",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // Qwen3.5-27b-thinking - Fallback: Nano-GPT > OpenRouter
    {
        name: "qwen3.5-27b-thinking",
        provider: "nanogpt",
        model: "nanogpt/qwen3.5-27b:thinking",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 1,
    },
    {
        name: "qwen3.5-27b-thinking",
        provider: "openrouter",
        model: "openrouter/qwen/qwen3.5-27b:thinking",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // MiniMax M2.5 - Fallback: Nano-GPT > OpenRouter
    {
        name: "minimax-m2.5",
        provider: "nanogpt",
        model: "nanogpt/minimax-m2.5",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 1,
    },
    {
        name: "minimax-m2.5",
        provider: "openrouter",
        model: "openrouter/minimax/minimax-m2.5",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
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
