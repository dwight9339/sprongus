import { Flags } from "@oclif/core";

import type { ConfigRecord } from "@sprongus/core";

import { ConfigBaseCommand } from "./base.js";

interface ExportResult {
  data: ConfigRecord;
  mode: "local" | "remote";
  prefix?: string;
}

export default class ConfigExport extends ConfigBaseCommand {
  static override description = "Export configuration entries as a JSON object";

  static override examples = [
    "$ sprongus config export",
    "$ sprongus config export --prefix feature. --json",
  ];

  static override flags = {
    ...ConfigBaseCommand.baseFlags,
    prefix: Flags.string({
      description: "Limit export to keys with the given prefix",
    }),
  } as const;

  async run(): Promise<ExportResult> {
    const { flags } = await this.parse(ConfigExport);
    return this.withContext(flags, async ({ service, mode }) => {
      const options =
        flags.prefix !== undefined ? { prefix: flags.prefix } : undefined;
      const data = await service.export(options);
      const result: ExportResult = { data, mode };
      if (flags.prefix !== undefined) {
        result.prefix = flags.prefix;
      }

      if (this.jsonEnabled()) {
        return result;
      }

      this.log(JSON.stringify(data, null, 2));
      return result;
    });
  }
}
