import { describe, expect, it } from "vitest";
import { markdownExporter } from "./markdown.exporter";
import type { ScriptBeat } from "../script";

describe("markdownExporter", () => {
  it("joins beats into markdown", () => {
    const beats: ScriptBeat[] = [
      {
        blockId: "1",
        parentBlockId: "p",
        scriptRootBlockId: "root",
        projectId: "proj",
        index: 0,
        html: "<p>One</p>",
        text: "One",
        hash: "a",
        lastFetched: "",
        lastUpdated: ""
      },
      {
        blockId: "2",
        parentBlockId: "p",
        scriptRootBlockId: "root",
        projectId: "proj",
        index: 1,
        html: "<p>Two</p>",
        text: "Two",
        hash: "b",
        lastFetched: "",
        lastUpdated: ""
      }
    ];

    const output = markdownExporter.export(beats);
    expect(output).toBe("One\n\nTwo");
  });
});
