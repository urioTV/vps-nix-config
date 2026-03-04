import { modelGroups } from "./models";

export const globalSettings = {
    router: {
        routing_strategy: "usage-based-routing-v2",
        enable_pre_call_checks: true
    },
    general: {
        master_key: "os.environ/LITELLM_MASTER_KEY",
        database_url: "os.environ/DATABASE_URL"
    }
};

export function buildSettingsYamlStr(): string {
    let yamlStr = `router_settings:\n`;
    yamlStr += `  routing_strategy: ${globalSettings.router.routing_strategy}\n`;
    yamlStr += `  enable_pre_call_checks: ${globalSettings.router.enable_pre_call_checks}\n`;
    yamlStr += `  # Fallback logic configuration according to priorities (Priority 1 -> 2 -> 3)\n`;
    yamlStr += `  fallbacks:\n`;

    for (const group of modelGroups) {
        if (group.variants.length > 1) {
            const primary = group.baseName;
            const fallbacks = group.variants.slice(1).map(v => `"${group.baseName}${v.nameSuffix}"`).join(", ");
            yamlStr += `    - ${primary}: [${fallbacks}]\n`;
        }
    }

    yamlStr += `\ngeneral_settings:\n`;
    yamlStr += `  master_key: ${globalSettings.general.master_key}\n`;
    yamlStr += `  database_url: ${globalSettings.general.database_url}\n`;

    return yamlStr;
}
