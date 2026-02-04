import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const MDLESS_DIR = join(homedir(), ".mdless");
export const CONFIG_PATH = join(MDLESS_DIR, "config.json");

export interface WorkingDirectory {
  path: string;
  name: string;
  sync: boolean;
}

export interface MdlessConfig {
  version: 1;
  workingDirectories: WorkingDirectory[];
}

export function ensureConfigDir(): void {
  if (!existsSync(MDLESS_DIR)) {
    mkdirSync(MDLESS_DIR, { recursive: true });
  }
}

export function loadConfig(): MdlessConfig {
  ensureConfigDir();

  if (!existsSync(CONFIG_PATH)) {
    return {
      version: 1,
      workingDirectories: [],
    };
  }

  const content = readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(content) as MdlessConfig;
}

export function saveConfig(config: MdlessConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}
