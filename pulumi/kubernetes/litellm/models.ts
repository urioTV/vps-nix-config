import { buildModelListYamlStr } from "./config/models";
import { buildSettingsYamlStr } from "./config/settings";

export function generateConfigYaml(): string {
    return buildModelListYamlStr() + buildSettingsYamlStr();
}
