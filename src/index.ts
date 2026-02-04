#!/usr/bin/env tsx
import { Command } from "commander";
import { select } from "@inquirer/prompts";
import packageJson from "../package.json" with { type: "json" };
import { scanCommand } from "./commands/scan.js";
import { skillsCommand } from "./commands/skills.js";
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
    name: "skills",
    description: "Share Claude Code skills across projects and teams",
    action: skillsCommand,
  },
  {
    name: "scan",
    description: "Find Claude workspaces on your computer",
    action: scanCommand,
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

// If no arguments provided, show interactive mode
if (process.argv.length <= 2) {
  interactiveMode();
} else {
  program.parse();
}
