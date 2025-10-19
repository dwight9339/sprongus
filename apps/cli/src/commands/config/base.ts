import { Command, Flags } from "@oclif/core";

import type { ConfigContext } from "../../config/context.js";
import { createConfigContext } from "../../config/context.js";

export type ConfigCommandFlags = {
  db?: string | undefined;
  remote?: string | undefined;
};

export abstract class ConfigBaseCommand extends Command {
  static override enableJsonFlag = true;

  static baseFlags = {
    db: Flags.string({
      description: "Path to local SQLite config database",
      helpValue: "<path>",
    }),
    remote: Flags.string({
      description:
        "Remote Sprongus API URL (defaults to $SPRONGUS_API_URL if set)",
    }),
  } as const;

  static override flags = ConfigBaseCommand.baseFlags;

  protected async withContext<T>(
    flags: ConfigCommandFlags,
    handler: (context: ConfigContext) => Promise<T>,
  ): Promise<T> {
    const remoteCandidate =
      flags.remote ?? process.env.SPRONGUS_API_URL ?? undefined;
    const remote =
      typeof remoteCandidate === "string" && remoteCandidate.trim().length > 0
        ? remoteCandidate
        : undefined;

    const contextOptions =
      remote !== undefined
        ? ({ remoteUrl: remote } as const)
        : ({
            ...(typeof flags.db === "string" && flags.db.length > 0
              ? { dbPath: flags.db }
              : {}),
          } as const);

    const context = await createConfigContext(contextOptions);

    try {
      return await handler(context);
    } finally {
      await context.close();
    }
  }
}
