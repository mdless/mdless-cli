import { readdirSync, statSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";
import { loadConfig, saveConfig } from "../config.js";
import { clearLine, formatDuration, truncatePath } from "../utils.js";

const EXCLUSIONS = new Set([
  "node_modules",
  "dist",
  "build",
  "Library",
  "Applications",
  "__pycache__",
  "venv",
  "worktrees",
  "workspaces",
  "tmp",
]);

function* walkDirectories(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.startsWith(".") || EXCLUSIONS.has(entry)) continue;

    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      yield fullPath;
      yield* walkDirectories(fullPath);
    }
  }
}

function isClaudeWorkspace(dir: string): boolean {
  return existsSync(join(dir, ".claude")) && existsSync(join(dir, ".git"));
}

export async function scanCommand(): Promise<void> {
  const startTime = Date.now();
  const home = homedir();

  console.log(`Scanning from ${home}...`);

  const found: string[] = [];
  let scanned = 0;

  for (const dir of walkDirectories(home)) {
    scanned++;
    if (isClaudeWorkspace(dir)) {
      found.push(dir);
    }
    if (scanned % 100 === 0) {
      clearLine();
      process.stdout.write(
        `  ${scanned.toLocaleString()} checked, ${found.length} found | ${truncatePath(dir)}`,
      );
    }
  }

  clearLine();

  const config = loadConfig();
  config.workingDirectories = found.map((path) => ({
    path,
    name: basename(path),
    sync: true,
  }));
  saveConfig(config);

  const duration = formatDuration(Date.now() - startTime);
  console.log(`\n✓ Found ${found.length} workspaces in ${duration}`);

  for (const dir of found) {
    console.log(`  • ${basename(dir)}`);
  }

  console.log(`\nSaved to ~/.mdless/config.json`);
}
