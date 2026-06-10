import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";

const BUNDLED_PROMPTS_DIR = join(
  import.meta.dirname!,
  "..",
  "agents",
  "prompts",
);

const GITIGNORE_ENTRIES = [".mdless/worktrees/", ".mdless/logs/"];

function ensureGitignore(): void {
  const gitignore = join(process.cwd(), ".gitignore");
  const existing = existsSync(gitignore) ? readFileSync(gitignore, "utf8") : "";
  const lines = new Set(existing.split("\n").map((l) => l.trim()));
  const missing = GITIGNORE_ENTRIES.filter((e) => !lines.has(e));
  if (missing.length === 0) return;

  const prefix = !existing || existing.endsWith("\n") ? "" : "\n";
  appendFileSync(gitignore, prefix + missing.map((e) => `${e}\n`).join(""));
  for (const entry of missing) {
    console.log(`✓ added ${entry} to .gitignore`);
  }
}

export async function initCommand(): Promise<void> {
  const targetDir = join(process.cwd(), ".mdless", "agents");
  mkdirSync(targetDir, { recursive: true });

  ensureGitignore();

  const files = readdirSync(BUNDLED_PROMPTS_DIR).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.error(`✗ no bundled prompts found at ${BUNDLED_PROMPTS_DIR}`);
    process.exit(1);
  }

  let copied = 0;
  let skipped = 0;
  for (const file of files) {
    const dest = join(targetDir, file);
    if (existsSync(dest)) {
      console.log(`! ${file} already exists in .mdless/agents/ (skipped)`);
      skipped++;
      continue;
    }
    copyFileSync(join(BUNDLED_PROMPTS_DIR, file), dest);
    console.log(`✓ ${file}`);
    copied++;
  }

  console.log(
    `\n${copied} copied, ${skipped} skipped → .mdless/agents/`,
  );
  console.log(`Edit those files to customize prompts, then run \`mdless agent <name>\`.`);
}
