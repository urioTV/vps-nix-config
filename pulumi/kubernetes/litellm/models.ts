export interface ModelConfig {
    name: string;
    provider: string;
    model: string;
    apiKeyEnvVar: string;
}

export const models: ModelConfig[] = [
    {
        name: "gpt-4o",
        provider: "openai",
        model: "openai/gpt-4o",
        apiKeyEnvVar: "OPENAI_API_KEY",
    },
    {
        name: "gpt-4o-mini",
        provider: "openai",
        model: "openai/gpt-4o-mini",
        apiKeyEnvVar: "OPENAI_API_KEY",
    },
    {
        name: "gpt-4-turbo",
        provider: "openai",
        model: "openai/gpt-4-turbo",
        apiKeyEnvVar: "OPENAI_API_KEY",
    },
    {
        name: "gpt-3.5-turbo",
        provider: "openai",
        model: "openai/gpt-3.5-turbo",
        apiKeyEnvVar: "OPENAI_API_KEY",
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
