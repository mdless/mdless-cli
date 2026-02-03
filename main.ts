#!/usr/bin/env tsx
import * as p from "@clack/prompts";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const claudeDir = join(cwd, ".claude");

if (!existsSync(claudeDir)) {
  const shouldCreate = await p.confirm({
    message: "No .claude folder found. Create one?",
  });

  if (p.isCancel(shouldCreate) || !shouldCreate) {
    p.log.info("Aborted.");
    process.exit(0);
  }

  mkdirSync(claudeDir);
  p.log.success("Created .claude folder.");
}

const skillsDir = join(import.meta.dirname!, "skills");
const skills = readdirSync(skillsDir).filter((name) =>
  statSync(join(skillsDir, name)).isDirectory()
);

const selected = await p.multiselect({
  message: "Select skills to install:",
  options: skills.map((s) => ({ value: s, label: s })),
});

if (p.isCancel(selected) || selected.length === 0) {
  p.log.info("No skills selected.");
} else {
  p.log.success("You selected:");
  selected.forEach((s) => console.log(`  ✓ ${s}`));
}
