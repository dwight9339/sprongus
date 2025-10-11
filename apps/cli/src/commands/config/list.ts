import { Flags } from "@oclif/core";

import type { ConfigEntry, ListConfigOptions } from "@sprongus/core";

import { ConfigBaseCommand } from "./base.js";

interface ListResult {
  entries: ConfigEntry[];
  mode: "local" | "remote";
}

export default class ConfigList extends ConfigBaseCommand {
  static override description = "List configuration keys";

  static override examples = [
    "$ sprongus config list",
    "$ sprongus config list --prefix app.",
    "$ sprongus config list --values",
  ];

  static override flags = {
    ...ConfigBaseCommand.baseFlags,
    prefix: Flags.string({
      description: "Limit results to keys with the given prefix",
    }),
    limit: Flags.integer({
      description: "Maximum number of rows to return",
    }),
    offset: Flags.integer({
      description: "Offset to start listing from",
    }),
    values: Flags.boolean({
      description: "Include values in plain output",
      default: false,
    }),
  } as const;

  async run(): Promise<ListResult> {
    const { flags } = await this.parse(ConfigList);
    return this.withContext(flags, async ({ service, mode }) => {
      const options: ListConfigOptions = {
        includeValues: flags.values ?? false,
      };
      if (flags.prefix !== undefined) {
        options.prefix = flags.prefix;
      }
      if (typeof flags.limit === "number") {
        options.limit = flags.limit;
      }
      if (typeof flags.offset === "number") {
        options.offset = flags.offset;
      }

      const entries = await service.list(options);

      const result: ListResult = { entries, mode };

      if (this.jsonEnabled()) {
        return result;
      }

      if (entries.length === 0) {
        this.log("No configuration entries found.");
        return result;
      }

      for (const entry of entries) {
        if (flags.values) {
          this.log(`${entry.key}\t${JSON.stringify(entry.value)}`);
        } else {
          this.log(entry.key);
        }
      }

      return result;
    });
  }
}
