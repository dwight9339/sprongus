import type { ScriptBeat, ScriptDocument } from "../script";
import type { ScriptExportOptions, ScriptExporter } from "./index";

/**
 * Simple exporter that joins beat text into a Markdown document.
 */
export const markdownExporter: ScriptExporter = {
  id: "markdown",
  label: "Markdown",
  extensions: ["md"],
  export(script: ScriptDocument, opts: ScriptExportOptions = {}): string {
    const lineBreak = opts.lineBreak ?? "\n";
    const beats = script as ScriptBeat[];
    const chunks = beats.map((beat) => {
      const idPrefix = opts.includeIds ? `${beat.blockId} ` : "";
      return `${idPrefix}${beat.text}`;
    });
    return chunks.join(`${lineBreak}${lineBreak}`);
  }
};
