import { Args } from "@oclif/core";

import { ConfigBaseCommand } from "./base.js";

interface UnsetResult {
  key: string;
  mode: "local" | "remote";
  removed: boolean;
}

export default class ConfigUnset extends ConfigBaseCommand {
  static override description = "Remove a configuration key";

  static override examples = ["$ sprongus config unset app.debug"];

  static override args = {
    key: Args.string({ description: "Configuration key", required: true }),
  } as const;

  async run(): Promise<UnsetResult> {
    const { args, flags } = await this.parse(ConfigUnset);

    return this.withContext(flags, async ({ service, mode }) => {
      const existing = await service.get(args.key);
      await service.unset(args.key);

      const result: UnsetResult = {
        key: args.key,
        mode,
        removed: Boolean(existing),
      };

      if (this.jsonEnabled()) {
        return result;
      }

      if (existing) {
        this.log(`Removed ${args.key}`);
      } else {
        this.warn(`Key "${args.key}" did not exist.`);
      }

      return result;
    });
  }
}
