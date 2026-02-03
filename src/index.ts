#!/usr/bin/env tsx
import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import { skillsCommand } from "./commands/skills.js";

const program = new Command()
  .name("mdless")
  .description("CLI tools for Claude Code hard-working devs")
  .version(packageJson.version);

program
  .command("skills")
  .description("Share Claude Code skills across projects and teams")
  .action(skillsCommand);

program.parse();
