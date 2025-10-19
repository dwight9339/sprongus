import { Args } from "@oclif/core";

import type { ConfigEntry } from "@sprongus/core";

import { ConfigBaseCommand } from "./base.js";

interface GetResult {
  key: string;
  found: boolean;
  value: ConfigEntry["value"] | null;
  mode: "local" | "remote";
}

export default class ConfigGet extends ConfigBaseCommand {
  static override description = "Get a configuration value";

  static override examples = [
    "$ sprongus config get app.debug",
    "$ sprongus config get feature.alpha --json",
  ];

  static override args = {
    key: Args.string({ description: "Configuration key", required: true }),
  } as const;

  async run(): Promise<GetResult> {
    const { args, flags } = await this.parse(ConfigGet);
    const key = args.key;

    return this.withContext(flags, async ({ service, mode }) => {
      const entry = await service.get(key);
      const result: GetResult = {
        key,
        found: Boolean(entry),
        value: entry?.value ?? null,
        mode,
      };

      if (this.jsonEnabled()) {
        return result;
      }

      if (!entry) {
        this.warn(`Key "${key}" was not found.`);
      } else {
        this.log(JSON.stringify(entry.value, null, 2));
      }

      return result;
    });
  }
}
