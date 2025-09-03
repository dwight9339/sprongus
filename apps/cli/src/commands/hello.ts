import {Args, Command} from "@oclif/core";

export default class Hello extends Command {
  static override description = "Say hello from Sprongus CLI";

  static override examples = ["sprongus hello", "sprongus hello Sprongus"];

  static override args = {
    name: Args.string({description: "name to greet", required: false}),
  } as const;

  async run(): Promise<void> {
    const {args} = await this.parse(Hello);
    const who = args.name ?? "world";
    this.log(`hello ${who}`);
  }
}

