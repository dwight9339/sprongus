import { Command } from "@oclif/core";

export default class ConfigIndex extends Command {
  static override description = "Manage Sprongus configuration values";

  static override examples = [
    "$ sprongus config list",
    "$ sprongus config get app.debug",
  ];

  async run(): Promise<void> {
    await this.parse(ConfigIndex);
    this.log(
      "Use one of the sub-commands: get, set, unset, list, import, export.",
    );
    this.log("Run `sprongus config <command> --help` for details.");
  }
}
