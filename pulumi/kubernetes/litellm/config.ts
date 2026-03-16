export interface ModelVariant {
    provider: string;
    nameSuffix: string;
    modelOverride?: string;
    apiBase?: string;
    apiKeyEnvVar?: string;
    apiKey?: string;
    timeout?: number;
    extraBody?: Record<string, unknown>;
}

export interface ModelGroup {
    baseName: string;
    title: string;
    variants: ModelVariant[];
}

// ----------------------------------------------------------------------------
// PROVIDERS CONFIGURATION
// ----------------------------------------------------------------------------
const providers: Record<string, { apiKeyEnvVar?: string; apiKey?: string; modelPrefix: string; apiBase?: string }> = {
    zai: {
        apiKeyEnvVar: "ZAI_API_KEY",
        modelPrefix: "zai/",
        apiBase: "https://api.z.ai/api/coding/paas/v4"
    },
    nanogpt: {
        apiKeyEnvVar: "NANOGPT_API_KEY",
        modelPrefix: "openai/",
        apiBase: "https://nano-gpt.com/api/v1"
    },
    openrouter: {
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        modelPrefix: "openrouter/"
    },
    "cli-github": {
        apiKey: "github-copilot",
        modelPrefix: "openai/",
        apiBase: "http://cli-proxy-api.cli-proxy-api.svc.cluster.local:8317/v1"
    },
    "cli-google": {
        apiKey: "google",
        modelPrefix: "openai/",
        apiBase: "http://cli-proxy-api.cli-proxy-api.svc.cluster.local:8317/v1"
    },
    "cli-antigravity": {
        apiKey: "antigravity",
        modelPrefix: "openai/",
        apiBase: "http://cli-proxy-api.cli-proxy-api.svc.cluster.local:8317/v1"
    },
    "cli-claude": {
        apiKey: "claude",
        modelPrefix: "openai/",
        apiBase: "http://cli-proxy-api.cli-proxy-api.svc.cluster.local:8317/v1"
    }
};

// ----------------------------------------------------------------------------
// MODELS CONFIGURATION
// ----------------------------------------------------------------------------
function createGroup(baseName: string, title: string, variants: Partial<ModelVariant>[]): ModelGroup {
    return {
        baseName,
        title,
        variants: variants.map(v => {
            const provider = providers[v.provider!];
            return {
                provider: v.provider!,
                nameSuffix: v.nameSuffix ?? "",
                // If modelOverride is provided, use it directly with provider prefix, otherwise use baseName
                modelOverride: provider.modelPrefix + (v.modelOverride || baseName),
                apiKeyEnvVar: provider.apiKeyEnvVar,
                apiKey: provider.apiKey,
                apiBase: provider.apiBase,
                timeout: v.timeout,
                extraBody: v.extraBody
            };
        })
    };
}

export const modelGroups: ModelGroup[] = [
    createGroup("glm-5", "GLM-5", [
        { provider: "zai", nameSuffix: "" },
        { provider: "nanogpt", nameSuffix: "-nano" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "z-ai/glm-5" }
    ]),
    createGroup("glm-4.7", "GLM-4.7", [
        { provider: "zai", nameSuffix: "", timeout: 120 },
        { provider: "nanogpt", nameSuffix: "-nano" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "z-ai/glm-4.7" }
    ]),
    createGroup("qwen3.5-397b", "Qwen3.5-397b", [
        { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-397b-a17b" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-397b-a17b", extraBody: { include_reasoning: false } }
    ]),
    createGroup("qwen3.5-397b-thinking", "Qwen3.5-397b-thinking", [
        { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-397b-a17b:thinking" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-397b-a17b", extraBody: { include_reasoning: true } }
    ]),
    createGroup("qwen3.5-122b", "Qwen3.5-122b", [
        { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-122b-a10b" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-122b-a10b", extraBody: { include_reasoning: false } }
    ]),
    createGroup("qwen3.5-122b-thinking", "Qwen3.5-122b-thinking", [
        { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-122b-a10b:thinking" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-122b-a10b", extraBody: { include_reasoning: true } }
    ]),
    createGroup("qwen3.5-35b", "Qwen3.5-35b", [
        { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-35b-a3b" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-35b-a3b", extraBody: { include_reasoning: false } }
    ]),
    createGroup("qwen3.5-35b-thinking", "Qwen3.5-35b-thinking", [
        { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-35b-a3b:thinking" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-35b-a3b", extraBody: { include_reasoning: true } }
    ]),
    createGroup("qwen3.5-27b", "Qwen3.5-27b", [
        { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-27b" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-27b", extraBody: { include_reasoning: false } }
    ]),
    createGroup("qwen3.5-27b-thinking", "Qwen3.5-27b-thinking", [
        { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-27b:thinking" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-27b", extraBody: { include_reasoning: true } }
    ]),
    createGroup("minimax-m2.5", "MiniMax M2.5", [
        { provider: "nanogpt", nameSuffix: "" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "minimax/minimax-m2.5" }
    ]),
    // ------------------------------------------------------------------------
    // CLAUDE FAMILY (GitHub Copilot -> OpenRouter fallback)
    // ------------------------------------------------------------------------
    createGroup("claude-opus-4.6", "Claude Opus 4.6", [
        { provider: "cli-github", nameSuffix: "", modelOverride: "claude-opus-4.6" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "anthropic/claude-opus-4.6" }
    ]),
    createGroup("claude-opus-4.6-fast", "Claude Opus 4.6 Fast", [
        { provider: "cli-github", nameSuffix: "", modelOverride: "claude-opus-4.6-fast" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "anthropic/claude-opus-4.6" }
    ]),
    createGroup("claude-sonnet-4.6", "Claude Sonnet 4.6", [
        { provider: "cli-github", nameSuffix: "", modelOverride: "claude-sonnet-4.6" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "anthropic/claude-sonnet-4.6" }
    ]),
    createGroup("claude-haiku-4.5", "Claude Haiku 4.5", [
        { provider: "cli-github", nameSuffix: "", modelOverride: "claude-haiku-4.5" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "anthropic/claude-haiku-4.5" }
    ]),
    // ------------------------------------------------------------------------
    // CLAUDE CODE FAMILY (Claude Code CLI -> exclusive)
    // ------------------------------------------------------------------------
    createGroup("claudecode-opus-4.6", "Claude Code Opus 4.6", [
        { provider: "cli-claude", nameSuffix: "", modelOverride: "claude-opus-4-6" }
    ]),
    createGroup("claudecode-opus-4.6-fast", "Claude Code Opus 4.6 Fast", [
        { provider: "cli-claude", nameSuffix: "", modelOverride: "claude-opus-4-6-fast" }
    ]),
    createGroup("claudecode-sonnet-4.6", "Claude Code Sonnet 4.6", [
        { provider: "cli-claude", nameSuffix: "", modelOverride: "claude-sonnet-4-6" }
    ]),
    createGroup("claudecode-haiku-4.5", "Claude Code Haiku 4.5", [
        { provider: "cli-claude", nameSuffix: "", modelOverride: "claude-haiku-4-5-20251001" }
    ]),
    // ------------------------------------------------------------------------
    // GPT-5 FAMILY (GitHub Copilot -> OpenRouter fallback)
    // ------------------------------------------------------------------------
    createGroup("gpt-5.4", "GPT 5.4", [
        { provider: "cli-github", nameSuffix: "", modelOverride: "gpt-5.4" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "openai/gpt-5.4" }
    ]),
    createGroup("gpt-5.3-codex", "GPT 5.3 Codex", [
        { provider: "cli-github", nameSuffix: "", modelOverride: "gpt-5.3-codex" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "openai/gpt-5.3-codex" }
    ]),
    createGroup("gpt-5.2", "GPT 5.2", [
        { provider: "cli-github", nameSuffix: "", modelOverride: "gpt-5.2" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "openai/gpt-5.2" }
    ]),
    createGroup("gpt-5.2-codex", "GPT 5.2 Codex", [
        { provider: "cli-github", nameSuffix: "", modelOverride: "gpt-5.2-codex" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "openai/gpt-5.2-codex" }
    ]),
    createGroup("gpt-5.1", "GPT 5.1", [
        { provider: "cli-github", nameSuffix: "", modelOverride: "gpt-5.1" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "openai/gpt-5.1" }
    ]),
    createGroup("gpt-5.1-codex", "GPT 5.1 Codex", [
        { provider: "cli-github", nameSuffix: "", modelOverride: "gpt-5.1-codex" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "openai/gpt-5.1-codex" }
    ]),
    createGroup("gpt-5.1-codex-max", "GPT 5.1 Codex Max", [
        { provider: "cli-github", nameSuffix: "", modelOverride: "gpt-5.1-codex-max" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "openai/gpt-5.1-codex-max" }
    ]),
    createGroup("gpt-5.1-codex-mini", "GPT 5.1 Codex Mini", [
        { provider: "cli-github", nameSuffix: "", modelOverride: "gpt-5.1-codex-mini" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "openai/gpt-5.1-codex-mini" }
    ]),
    createGroup("gpt-5-mini", "GPT 5 Mini", [
        { provider: "cli-github", nameSuffix: "", modelOverride: "gpt-5-mini" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "openai/gpt-5-mini" }
    ]),
    // ------------------------------------------------------------------------
    // GEMINI FAMILY (Google -> OpenRouter fallback)
    // ------------------------------------------------------------------------
    createGroup("gemini-3.1-pro-preview", "Gemini 3.1 Pro Preview", [
        { provider: "cli-google", nameSuffix: "", modelOverride: "gemini-3.1-pro-preview" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "google/gemini-3.1-pro-preview" }
    ]),
    createGroup("gemini-3-flash-preview", "Gemini 3 Flash Preview", [
        { provider: "cli-google", nameSuffix: "", modelOverride: "gemini-3-flash-preview" },
        { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "google/gemini-3-flash-preview" }
    ]),
    // ------------------------------------------------------------------------
    // ANTIGRAVITY FAMILY (exclusive models via CLI proxy)
    // ------------------------------------------------------------------------
    createGroup("antigravity-claude-opus-4-6-thinking", "Claude Opus 4.6 Thinking", [
        { provider: "cli-antigravity", nameSuffix: "", modelOverride: "claude-opus-4-6-thinking" }
    ]),
    createGroup("antigravity-claude-sonnet-4-6", "Claude Sonnet 4.6", [
        { provider: "cli-antigravity", nameSuffix: "", modelOverride: "claude-sonnet-4-6" }
    ]),
    createGroup("antigravity-gemini-3-flash", "Gemini 3 Flash", [
        { provider: "cli-antigravity", nameSuffix: "", modelOverride: "gemini-3-flash" }
    ]),
    createGroup("antigravity-gemini-3.1-pro-high", "Gemini 3.1 Pro High", [
        { provider: "cli-antigravity", nameSuffix: "", modelOverride: "gemini-3.1-pro-high" }
    ]),
    createGroup("antigravity-gemini-3.1-pro-low", "Gemini 3.1 Pro Low", [
        { provider: "cli-antigravity", nameSuffix: "", modelOverride: "gemini-3.1-pro-low" }
    ]),
    createGroup("antigravity-gemini-3.1-flash-image", "Gemini 3.1 Flash Image", [
        { provider: "cli-antigravity", nameSuffix: "", modelOverride: "gemini-3.1-flash-image" }
    ])
];

// ----------------------------------------------------------------------------
// GENERATOR
// ----------------------------------------------------------------------------
export function generateConfigYaml(): string {
    let yamlStr = "model_list:\n";

    for (const group of modelGroups) {
        yamlStr += `  # ==========================================\n`;
        yamlStr += `  # ${group.title}\n`;
        yamlStr += `  # ==========================================\n`;

        for (const variant of group.variants) {
            yamlStr += `  - model_name: ${group.baseName}${variant.nameSuffix}\n`;
            yamlStr += `    litellm_params:\n`;
            yamlStr += `      model: ${variant.modelOverride}\n`;

            if (variant.apiKeyEnvVar) {
                yamlStr += `      api_key: "os.environ/${variant.apiKeyEnvVar}"\n`;
            } else if (variant.apiKey) {
                yamlStr += `      api_key: "${variant.apiKey}"\n`;
            } else {
                yamlStr += `      api_key: "sk-dummy"\n`;
            }

            if (variant.apiBase) yamlStr += `      api_base: "${variant.apiBase}"\n`;
            if (variant.timeout) yamlStr += `      timeout: ${variant.timeout}\n`;
            if (variant.extraBody) {
                yamlStr += `      extra_body:\n`;
                for (const [k, v] of Object.entries(variant.extraBody)) {
                    yamlStr += `        ${k}: ${v}\n`;
                }
            }
            yamlStr += `\n`;
        }
    }

    yamlStr += `router_settings:\n`;
    yamlStr += `  enable_pre_call_checks: true\n`;
    yamlStr += `  fallbacks:\n`;

    for (const group of modelGroups) {
        if (group.variants.length > 1) {
            const primary = group.baseName;
            const fallbacks = group.variants.slice(1).map(v => `"${group.baseName}${v.nameSuffix}"`).join(", ");
            yamlStr += `    - ${primary}: [${fallbacks}]\n`;
        }
    }

    yamlStr += `\ngeneral_settings:\n`;
    yamlStr += `  master_key: os.environ/LITELLM_MASTER_KEY\n`;
    yamlStr += `  database_url: os.environ/DATABASE_URL\n`;

    return yamlStr;
}
