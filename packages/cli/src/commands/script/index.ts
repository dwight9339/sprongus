import { Command } from "@oclif/core";

export default class Script extends Command {
  static description = "Work with cached scripts";

  async run(): Promise<void> {
    this.log("Use a subcommand: export");
    this.log("Run with --help to see all options.");
  }
}
