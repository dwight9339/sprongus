import { Args, Command, Flags } from "@oclif/core";
import { Export, ScriptCache } from "@sprongus/core";
import { promises as fs } from "node:fs";
import path from "node:path";

export default class ScriptExport extends Command {
  static args = {
    scriptBlockId: Args.string({ description: "Root block ID of the script", required: true })
  };
  static description = "Export a cached script to a file";
  static flags = {
    format: Flags.string({ char: "f", description: "Exporter format", default: "markdown" }),
    out: Flags.string({ char: "o", description: "Output file path", required: true })
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ScriptExport);
    const { scriptBlockId } = args;
    const { format, out } = flags;
    const beats = ScriptCache.listBeatsByScriptId(scriptBlockId);
    const exporter = Export.resolveScriptExporter(format as Export.ScriptExporterId);
    const contents = exporter.export(beats);
    await fs.writeFile(path.resolve(out), contents);
    this.log(`Script exported to ${out}`);
  }
}
