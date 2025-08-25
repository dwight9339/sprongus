/* Core types used by the exporters */
import { ScriptDocument } from "../script"; // your existing shape
import { StoryboardRow } from "../storyboard"; // canonical row type
import { AuxTableRecord } from "../cache/auxTable.cache"; // generic aux entry
import { markdownExporter } from "./markdown.exporter";

/* ─────────── Interfaces ─────────── */

export interface ScriptExportOptions {
  lineBreak?: "\n" | "\r\n";
  includeIds?: boolean;
  [key: string]: unknown; // exporter-specific flags
}

export interface ScriptExporter {
  /** unique identifier, becomes CLI flag value */
  id: string;
  /** human label, shown in help menus */
  label: string;
  /** filename extensions this exporter usually writes */
  extensions: string[];
  /** convert in-memory ScriptDocument → string / Buffer */
  export(script: ScriptDocument, opts?: ScriptExportOptions): string | Buffer;
}

export interface TableExportOptions {
  [key: string]: unknown;
}

export interface TableExporter {
  id: string;
  label: string;
  extensions: string[];
  export(rows: StoryboardRow[] | AuxTableRecord[], opts?: TableExportOptions): string | Buffer;
}

/* ─────────── Registry & resolver ─────────── */

const scriptRegistry = {
  markdown: markdownExporter
} as const;

export type ScriptExporterId = keyof typeof scriptRegistry;

export function resolveScriptExporter(id: ScriptExporterId): ScriptExporter {
  return scriptRegistry[id];
}

export { markdownExporter };

/* You can create a similar registry for TableExporter if you like */

