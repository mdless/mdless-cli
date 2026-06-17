#!/usr/bin/env tsx
import { Command } from "commander";
import { select } from "@inquirer/prompts";
import packageJson from "../package.json" with { type: "json" };
import { agentCommand, listAgents } from "./commands/agent.js";
import { initCommand } from "./commands/init.js";
import { withExitHandler } from "./utils.js";

const banner = `
\x1b[38;5;135m██╗\x1b[0m     \x1b[38;5;141m███╗   ███╗\x1b[38;5;147m██████╗ \x1b[38;5;153m██╗     \x1b[38;5;159m███████╗\x1b[38;5;195m███████╗\x1b[38;5;231m███████╗
\x1b[38;5;135m╚██╗\x1b[0m    \x1b[38;5;141m████╗ ████║\x1b[38;5;147m██╔══██╗\x1b[38;5;153m██║     \x1b[38;5;159m██╔════╝\x1b[38;5;195m██╔════╝\x1b[38;5;231m██╔════╝
\x1b[38;5;135m ╚██╗\x1b[0m   \x1b[38;5;141m██╔████╔██║\x1b[38;5;147m██║  ██║\x1b[38;5;153m██║     \x1b[38;5;159m█████╗  \x1b[38;5;195m███████╗\x1b[38;5;231m███████╗
\x1b[38;5;135m ██╔╝\x1b[0m   \x1b[38;5;141m██║╚██╔╝██║\x1b[38;5;147m██║  ██║\x1b[38;5;153m██║     \x1b[38;5;159m██╔══╝  \x1b[38;5;195m╚════██║\x1b[38;5;231m╚════██║
\x1b[38;5;135m██╔╝\x1b[0m    \x1b[38;5;141m██║ ╚═╝ ██║\x1b[38;5;147m██████╔╝\x1b[38;5;153m███████╗\x1b[38;5;159m███████╗\x1b[38;5;195m███████║\x1b[38;5;231m███████║
\x1b[38;5;135m╚═╝\x1b[0m     \x1b[38;5;141m╚═╝     ╚═╝\x1b[38;5;147m╚═════╝ \x1b[38;5;153m╚══════╝\x1b[38;5;159m╚══════╝\x1b[38;5;195m╚══════╝\x1b[38;5;231m╚══════╝\x1b[0m
`;

const commands = [
  {
    name: "init",
    description: "Copy the default agent prompts into .mdless/agents/",
    action: initCommand,
  },
] as const;

async function interactiveMode(): Promise<void> {
  console.log(banner);
  console.log(
    `\x1b[2m  Mind less, ship more. v${packageJson.version}\x1b[0m\n`,
  );

  const choice = await withExitHandler(
    select({
      message: "What would you like to do?",
      choices: [
        ...commands.map((cmd) => ({
          name: cmd.name,
          value: cmd.name,
          description: cmd.description,
        })),
        { name: "exit", value: "exit", description: "Exit the CLI" },
      ],
    }),
  );

  if (choice === "exit") {
    process.exit(0);
  }

  const command = commands.find((cmd) => cmd.name === choice);
  if (command) {
    await command.action();
  }
}

const program = new Command()
  .name("mdless")
  .description("CLI tools for Claude Code hard-working devs")
  .version(packageJson.version);

for (const cmd of commands) {
  program.command(cmd.name).description(cmd.description).action(cmd.action);
}

program
  .command("agent [name]")
  .description("Run a single agent — reads the prompt from .mdless/agents/<name>.md")
  .option(
    "--loop [count]",
    "Run the agent on repeat — forever, or <count> times if given",
    (v) => parseInt(v, 10),
  )
  .action(async (name: string | undefined, options: { loop?: boolean | number }) => {
    if (!name) {
      const agents = listAgents();
      if (agents.length === 0) {
        console.error("✗ no agents found — run `mdless init` to create the default prompts.");
        process.exit(1);
      }
      name = await withExitHandler(
        select({
          message: "Which agent would you like to run?",
          choices: agents.map((a) => ({ name: a, value: a })),
        }),
      );
    }
    agentCommand(name, options);
  });

// If no arguments provided, show interactive mode
if (process.argv.length <= 2) {
  interactiveMode();
} else {
  program.parse();
}
