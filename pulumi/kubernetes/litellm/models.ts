export interface ModelConfig {
    name: string;
    provider: string;
    model: string;
    apiKeyEnvVar: string;
}

export const models: ModelConfig[] = [
    // OpenRouter models
    {
        name: "openrouter-auto",
        provider: "openrouter",
        model: "openrouter/auto",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
    },
    {
        name: "claude-3.5-sonnet",
        provider: "openrouter",
        model: "openrouter/anthropic/claude-3.5-sonnet",
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

    // Nano-GPT models
    {
        name: "nanogpt-4o",
        provider: "nanogpt",
        model: "nanogpt/gpt-4o",
        apiKeyEnvVar: "NANOGPT_API_KEY",
    },
    {
        name: "nanogpt-4o-mini",
        provider: "nanogpt",
        model: "nanogpt/gpt-4o-mini",
        apiKeyEnvVar: "NANOGPT_API_KEY",
    },
    {
        name: "nanogpt-o3-mini",
        provider: "nanogpt",
        model: "nanogpt/o3-mini",
        apiKeyEnvVar: "NANOGPT_API_KEY",
    },
    {
        name: "nanogpt-claude-3.5-sonnet",
        provider: "nanogpt",
        model: "nanogpt/claude-3.5-sonnet",
        apiKeyEnvVar: "NANOGPT_API_KEY",
    },

    // GLM Coding Plan (ZhipuAI)
    {
        name: "glm-4-plus",
        provider: "glm",
        model: "glm-4-plus",
        apiKeyEnvVar: "GLM_API_KEY",
    },
    {
        name: "glm-4-flash",
        provider: "glm",
        model: "glm-4-flash",
        apiKeyEnvVar: "GLM_API_KEY",
    },
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
`;
}
