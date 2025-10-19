import { Flags } from "@oclif/core";

import type { ConfigEntry, ConfigRecord, ImportMode } from "@sprongus/core";

import { readFileText, readStdin } from "../../config/io.js";
import { ConfigBaseCommand } from "./base.js";

interface ImportResult {
  imported: ConfigEntry[];
  mode: ImportMode;
  source: "file" | "stdin";
  modeName: "local" | "remote";
}

export default class ConfigImport extends ConfigBaseCommand {
  static override description =
    "Import configuration entries from a JSON object";

  static override examples = [
    "$ sprongus config import --file ./config.json",
    "$ cat config.json | sprongus config import --stdin --mode replace",
  ];

  static override flags = {
    ...ConfigBaseCommand.baseFlags,
    file: Flags.string({
      description: "JSON file to import",
    }),
    stdin: Flags.boolean({
      description: "Read JSON from standard input",
      default: false,
    }),
    mode: Flags.string({
      description: "Import mode",
      options: ["merge", "replace"],
      default: "merge",
    }),
  } as const;

  async run(): Promise<ImportResult> {
    const { flags } = await this.parse(ConfigImport);
    if (!flags.stdin && !flags.file) {
      this.error("Provide --file or --stdin to import data");
    }
    if (flags.stdin && flags.file) {
      this.error("Choose either --file or --stdin, not both");
    }

    const payloadText = flags.stdin
      ? await readStdin()
      : await readFileText(flags.file!);

    let payload: ConfigRecord;
    try {
      const parsed = JSON.parse(payloadText) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Expected a JSON object with key/value pairs");
      }
      payload = parsed as ConfigRecord;
    } catch (error) {
      this.error(`Failed to parse JSON: ${(error as Error).message}`);
    }

    return this.withContext(flags, async ({ service, mode }) => {
      const imported = await service.import(payload, {
        mode: flags.mode as ImportMode,
      });

      const result: ImportResult = {
        imported,
        mode: flags.mode as ImportMode,
        source: flags.stdin ? "stdin" : "file",
        modeName: mode,
      };

      if (this.jsonEnabled()) {
        return result;
      }

      this.log(
        `Imported ${imported.length} entr${imported.length === 1 ? "y" : "ies"} (${flags.mode})`,
      );
      return result;
    });
  }
}
