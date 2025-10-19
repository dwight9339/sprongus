import { Args, Flags } from "@oclif/core";

import type { ConfigValue } from "@sprongus/core";

import { readStdin } from "../../config/io.js";
import { parseValueInput } from "../../config/values.js";
import { ConfigBaseCommand } from "./base.js";

interface SetResult {
  key: string;
  value: ConfigValue;
  mode: "local" | "remote";
}

export default class ConfigSet extends ConfigBaseCommand {
  static override description = "Set a configuration value";

  static override examples = [
    "$ sprongus config set app.debug true",
    "$ sprongus config set feature.flags '{\"beta\":true}'",
    "$ echo '{\"darkMode\":true}' | sprongus config set app.theme --stdin",
  ];

  static override args = {
    key: Args.string({ description: "Configuration key", required: true }),
    value: Args.string({ description: "Value (JSON)", required: false }),
  } as const;

  static override flags = {
    ...ConfigBaseCommand.baseFlags,
    stdin: Flags.boolean({
      description: "Read the value from standard input",
      default: false,
    }),
  } as const;

  async run(): Promise<SetResult> {
    const { args, flags } = await this.parse(ConfigSet);
    if (!flags.stdin && typeof args.value !== "string") {
      this.error("Value argument is required unless --stdin is used");
    }
    if (flags.stdin && typeof args.value === "string") {
      this.error("Provide either a value argument or --stdin, not both");
    }

    const rawValue = flags.stdin ? await readStdin() : (args.value ?? "");
    const parsedValue = parseValueInput(rawValue);

    return this.withContext(flags, async ({ service, mode }) => {
      const entry = await service.set(args.key, parsedValue);
      const result: SetResult = { key: entry.key, value: entry.value, mode };

      if (this.jsonEnabled()) {
        return result;
      }

      this.log(
        `Updated ${entry.key} = ${JSON.stringify(entry.value, null, 2)}`,
      );
      return result;
    });
  }
}
