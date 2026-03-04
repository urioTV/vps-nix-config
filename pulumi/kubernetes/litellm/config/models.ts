import { ModelGroup, createModelGroup } from "./lib";

export const modelGroups: ModelGroup[] = [
    createModelGroup({
        baseName: "glm-5",
        title: "GLM-5",
        variants: [
            { provider: "zai", nameSuffix: "" },
            { provider: "nanogpt", nameSuffix: "-nano" },
            { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "z-ai/glm-5" }
        ]
    }),
    createModelGroup({
        baseName: "glm-4.7",
        title: "GLM-4.7",
        variants: [
            { provider: "zai", nameSuffix: "", timeout: 120 },
            { provider: "nanogpt", nameSuffix: "-nano" },
            { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "z-ai/glm-4.7" }
        ]
    }),
    createModelGroup({
        baseName: "qwen3.5-397b",
        title: "Qwen3.5-397b",
        variants: [
            { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-397b-a17b" },
            { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-397b-a17b", extraBody: { include_reasoning: false } }
        ]
    }),
    createModelGroup({
        baseName: "qwen3.5-397b-thinking",
        title: "Qwen3.5-397b-thinking",
        variants: [
            { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-397b-a17b:thinking" },
            { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-397b-a17b", extraBody: { include_reasoning: true } }
        ]
    }),
    createModelGroup({
        baseName: "qwen3.5-122b",
        title: "Qwen3.5-122b",
        variants: [
            { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-122b-a10b" },
            { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-122b-a10b", extraBody: { include_reasoning: false } }
        ]
    }),
    createModelGroup({
        baseName: "qwen3.5-122b-thinking",
        title: "Qwen3.5-122b-thinking",
        variants: [
            { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-122b-a10b:thinking" },
            { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-122b-a10b", extraBody: { include_reasoning: true } }
        ]
    }),
    createModelGroup({
        baseName: "qwen3.5-35b",
        title: "Qwen3.5-35b",
        variants: [
            { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-35b-a3b" },
            { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-35b-a3b", extraBody: { include_reasoning: false } }
        ]
    }),
    createModelGroup({
        baseName: "qwen3.5-35b-thinking",
        title: "Qwen3.5-35b-thinking",
        variants: [
            { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-35b-a3b:thinking" },
            { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-35b-a3b", extraBody: { include_reasoning: true } }
        ]
    }),
    createModelGroup({
        baseName: "qwen3.5-27b",
        title: "Qwen3.5-27b",
        variants: [
            { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-27b" },
            { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-27b", extraBody: { include_reasoning: false } }
        ]
    }),
    createModelGroup({
        baseName: "qwen3.5-27b-thinking",
        title: "Qwen3.5-27b-thinking",
        variants: [
            { provider: "nanogpt", nameSuffix: "", modelOverride: "qwen3.5-27b:thinking" },
            { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "qwen/qwen3.5-27b", extraBody: { include_reasoning: true } }
        ]
    }),
    createModelGroup({
        baseName: "minimax-m2.5",
        title: "MiniMax M2.5",
        variants: [
            { provider: "nanogpt", nameSuffix: "" },
            { provider: "openrouter", nameSuffix: "-openrouter", modelOverride: "minimax/minimax-m2.5" }
        ]
    })
];

export function buildModelListYamlStr(): string {
    let yamlStr = "model_list:\n";

    for (const group of modelGroups) {
        yamlStr += `  # ==========================================\n`;
        yamlStr += `  # ${group.title}\n`;
        yamlStr += `  # ==========================================\n`;

        for (const variant of group.variants) {
            yamlStr += `  - model_name: ${group.baseName}${variant.nameSuffix}\n`;
            yamlStr += `    litellm_params:\n`;
            yamlStr += `      model: ${variant.model}\n`;
            yamlStr += `      api_key: "os.environ/${variant.apiKeyEnvVar}"\n`;
            if (variant.apiBase) {
                yamlStr += `      api_base: "${variant.apiBase}"\n`;
            }
            if (variant.timeout) {
                yamlStr += `      timeout: ${variant.timeout}\n`;
            }
            if (variant.extraBody) {
                yamlStr += `      extra_body:\n`;
                for (const [k, v] of Object.entries(variant.extraBody)) {
                    yamlStr += `        ${k}: ${v}\n`;
                }
            }
            yamlStr += `\n`;
        }
    }

    return yamlStr;
}
