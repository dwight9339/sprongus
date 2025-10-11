import os from "node:os";
import path from "node:path";

function getDefaultConfigDir(): string {
  const override = process.env.XDG_CONFIG_HOME;
  if (override && override.length > 0) {
    return override;
  }

  if (process.platform === "win32") {
    const appData =
      process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "Sprongus");
  }

  return path.join(os.homedir(), ".config");
}

export function resolveLocalDbPath(cliFlag?: string): string {
  if (cliFlag && cliFlag.length > 0) {
    return path.resolve(cliFlag);
  }

  const envOverride = process.env.SPRONGUS_DB_PATH;
  if (envOverride && envOverride.length > 0) {
    return path.resolve(envOverride);
  }

  const configDir = getDefaultConfigDir();
  return path.join(configDir, "sprongus", "sprongus.db");
}
