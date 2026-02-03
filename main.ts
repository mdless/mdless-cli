#!/usr/bin/env tsx
import { checkbox, confirm } from "@inquirer/prompts";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const claudeDir = join(cwd, ".claude");

if (!existsSync(claudeDir)) {
  const shouldCreate = await confirm({
    message: "No .claude folder found. Create one?",
  });

  if (!shouldCreate) {
    console.log("Aborted.");
    process.exit(0);
  }

  mkdirSync(claudeDir);
  console.log("✓ Created .claude folder.");
}

const skillsDir = join(import.meta.dirname!, "skills");
const skills = readdirSync(skillsDir).filter((name) =>
  statSync(join(skillsDir, name)).isDirectory(),
);

const destSkillsDir = join(claudeDir, "skills");

function isInstalled(skill: string): boolean {
  return existsSync(join(destSkillsDir, skill));
}

const selected = await checkbox({
  message: "Select skills to install:",
  choices: skills.map((skill) => ({
    name: skill,
    value: skill,
    checked: isInstalled(skill),
  })),
});

const installed: string[] = [];
const removed: string[] = [];

for (const skill of skills) {
  const src = join(skillsDir, skill);
  const dest = join(destSkillsDir, skill);
  const wasInstalled = isInstalled(skill);
  const shouldBeInstalled = selected.includes(skill);

  if (shouldBeInstalled && !wasInstalled) {
    cpSync(src, dest, { recursive: true });
    installed.push(skill);
  } else if (!shouldBeInstalled && wasInstalled) {
    rmSync(dest, { recursive: true });
    removed.push(skill);
  }
}

if (installed.length > 0 || removed.length > 0) {
  console.log("✓ Changes applied.");
}

const finalSkills = existsSync(destSkillsDir)
  ? readdirSync(destSkillsDir).filter((name) =>
      statSync(join(destSkillsDir, name)).isDirectory()
    )
  : [];

if (finalSkills.length > 0) {
  console.log(`\nInstalled skills: ${finalSkills.join(", ")}`);
} else {
  console.log("\nNo skills installed.");
}
