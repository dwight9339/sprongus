import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  afterAll,
  afterEach,
  beforeEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import { createConfigContext } from "../../config/context.js";
import ConfigExport from "./export.js";
import ConfigGet from "./get.js";
import ConfigImport from "./import.js";
import ConfigList from "./list.js";
import ConfigSet from "./set.js";
import ConfigUnset from "./unset.js";

async function createTempDbPath(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sprongus-cli-"));
  return path.join(dir, "config.db");
}

describe("sprongus config commands (local)", () => {
  beforeAll(() => {
    process.env.OCLIF_SKIP_USER_PLUGINS = "1";
    originalEmitWarning = process.emitWarning.bind(process);
    process.emitWarning = (() => undefined) as typeof process.emitWarning;
  });

  let originalEmitWarning: typeof process.emitWarning;

  let dbPath: string;

  beforeEach(async () => {
    dbPath = await createTempDbPath();
  });

  afterEach(async () => {
    const dir = path.dirname(dbPath);
    await fs.rm(dir, { recursive: true, force: true });
  });

  afterAll(() => {
    process.emitWarning = originalEmitWarning;
  });

  it("sets and retrieves a config value", async () => {
    await ConfigSet.run(["app.debug", "true", "--db", dbPath]);

    const context = await createConfigContext({ dbPath });
    const entry = await context.service.get("app.debug");
    await context.close();

    expect(entry?.value).toBe(true);

    await ConfigGet.run(["app.debug", "--db", dbPath]);
  });

  it("lists, exports, and unsets values", async () => {
    await ConfigSet.run(["feature.alpha", '{"enabled":true}', "--db", dbPath]);
    await ConfigSet.run(["feature.beta", "false", "--db", dbPath]);

    await ConfigList.run(["--db", dbPath, "--values"]);

    await ConfigExport.run(["--db", dbPath, "--prefix", "feature."]);

    await ConfigUnset.run(["feature.beta", "--db", dbPath]);

    const context = await createConfigContext({ dbPath });
    const remaining = await context.service.list();
    const exported = await context.service.export({ prefix: "feature." });
    await context.close();

    expect(remaining.map((entry) => entry.key)).toEqual(["feature.alpha"]);
    expect(exported).toEqual({
      "feature.alpha": { enabled: true },
    });
  });

  it("imports a JSON file with replace mode", async () => {
    const file = path.join(path.dirname(dbPath), "import.json");
    await fs.writeFile(
      file,
      JSON.stringify({
        "system.locale": "en-US",
        "system.timezone": "UTC",
      }),
      "utf8",
    );

    await ConfigImport.run([
      "--db",
      dbPath,
      "--file",
      file,
      "--mode",
      "replace",
    ]);

    const context = await createConfigContext({ dbPath });
    const map = await context.service.export();
    await context.close();

    expect(map).toEqual({
      "system.locale": "en-US",
      "system.timezone": "UTC",
    });
  });
});
