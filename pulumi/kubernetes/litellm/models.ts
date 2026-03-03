export interface ModelConfig {
    name: string;
    provider: string;
    model: string;
    apiKeyEnvVar: string;
    priority?: number; // Lower = higher priority (1 = primary, 2 = fallback 1, 3 = fallback 2)
}

export const models: ModelConfig[] = [
    // ============================================================================
    // GPT-4o - Fallback: Nano-GPT > OpenRouter
    // ============================================================================
    {
        name: "gpt-4o",
        provider: "nanogpt",
        model: "nanogpt/gpt-4o",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 1,
    },
    {
        name: "gpt-4o",
        provider: "openrouter",
        model: "openrouter/openai/gpt-4o",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // ============================================================================
    // GPT-4o-mini - Fallback: Nano-GPT > OpenRouter
    // ============================================================================
    {
        name: "gpt-4o-mini",
        provider: "nanogpt",
        model: "nanogpt/gpt-4o-mini",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 1,
    },
    {
        name: "gpt-4o-mini",
        provider: "openrouter",
        model: "openrouter/openai/gpt-4o-mini",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // ============================================================================
    // Claude 3.5 Sonnet - Fallback: Nano-GPT > OpenRouter
    // ============================================================================
    {
        name: "claude-3.5-sonnet",
        provider: "nanogpt",
        model: "nanogpt/claude-3.5-sonnet",
        apiKeyEnvVar: "NANOGPT_API_KEY",
        priority: 1,
    },
    {
        name: "claude-3.5-sonnet",
        provider: "openrouter",
        model: "openrouter/anthropic/claude-3.5-sonnet",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        priority: 2,
    },

    // ============================================================================
    // GLM-4-Plus - Fallback: GLM Coding Plan > OpenRouter
    // ============================================================================
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

    // ============================================================================
    // GLM-4-Flash - Fallback: GLM Coding Plan > OpenRouter
    // ============================================================================
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

    // ============================================================================
    // GLM-5 - OpenRouter only
    // ============================================================================
    {
        name: "glm-5",
        provider: "openrouter",
        model: "openrouter/z-ai/glm-5",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },

    // ============================================================================
    // GLM-4.7 - OpenRouter only
    // ============================================================================
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

    // ============================================================================
    // Qwen3.5 Series - OpenRouter only
    // ============================================================================
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

    // ============================================================================
    // MiniMax M2.5 Series - OpenRouter only
    // ============================================================================
    {
        name: "minimax-m2.5",
        provider: "openrouter",
        model: "openrouter/minimax/minimax-m2.5",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "minimax-m2.1",
        provider: "openrouter",
        model: "openrouter/minimax/minimax-m2.1",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "minimax-m2",
        provider: "openrouter",
        model: "openrouter/minimax/minimax-m2",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "minimax-m2-her",
        provider: "openrouter",
        model: "openrouter/minimax/minimax-m2-her",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "minimax-m1",
        provider: "openrouter",
        model: "openrouter/minimax/minimax-m1",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "minimax-01",
        provider: "openrouter",
        model: "openrouter/minimax/minimax-01",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },

    // ============================================================================
    // OpenRouter - Other Popular Models (no fallback)
    // ============================================================================
    {
        name: "openrouter-auto",
        provider: "openrouter",
        model: "openrouter/auto",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "claude-3-opus",
        provider: "openrouter",
        model: "openrouter/anthropic/claude-3-opus",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "gemini-2.0-flash",
        provider: "openrouter",
        model: "openrouter/google/gemini-2.0-flash-001",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "gemini-2.5-pro",
        provider: "openrouter",
        model: "openrouter/google/gemini-2.5-pro-preview",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "gpt-4.1",
        provider: "openrouter",
        model: "openrouter/openai/gpt-4.1",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "gpt-4.1-mini",
        provider: "openrouter",
        model: "openrouter/openai/gpt-4.1-mini",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "o3",
        provider: "openrouter",
        model: "openrouter/openai/o3",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "o4-mini",
        provider: "openrouter",
        model: "openrouter/openai/o4-mini",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "o3-mini",
        provider: "nanogpt",
        model: "nanogpt/o3-mini",
        apiKeyEnvVar: "NANOGPT_API_KEY",
    },
    {
        name: "deepseek-r1",
        provider: "openrouter",
        model: "openrouter/deepseek/deepseek-r1",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "deepseek-v3",
        provider: "openrouter",
        model: "openrouter/deepseek/deepseek-chat-v3-0324",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },

    // ============================================================================
    // GLM Coding Plan - Direct API (no fallback, cheapest for GLM)
    // ============================================================================
    {
        name: "glm-4-air",
        provider: "glm",
        model: "glm-4-air",
        apiKeyEnvVar: "GLM_API_KEY",
    },
    {
        name: "glm-z1-airx",
        provider: "glm",
        model: "glm-z1-airx",
        apiKeyEnvVar: "GLM_API_KEY",
    },
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

# Fallback configuration: LiteLLM automatically tries next provider on failure
# Priority: GLM Coding Plan > Nano-GPT > OpenRouter
`;
}
