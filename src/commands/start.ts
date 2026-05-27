import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  appendFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { platform } from "node:os";
import { confirm } from "@inquirer/prompts";
import { initCommand } from "./init.js";
import { withExitHandler } from "../utils.js";

const SESSION_PREFIX = "mdless";
const LABELS: Array<{ name: string; color: string; description: string }> = [
  {
    name: "mdless/work",
    color: "0E8A16",
    description: "Tracked by the mdless agent system",
  },
  {
    name: "mdless/approved",
    color: "5319E7",
    description: "Approved via mdless",
  },
];

function which(cmd: string): boolean {
  const result = spawnSync("which", [cmd], { stdio: "ignore" });
  return result.status === 0;
}

type InstallPlan = { manager: string; args: string[] } | null;

function installPlan(pkg: string): InstallPlan {
  if (platform() === "darwin" && which("brew")) {
    return { manager: "brew", args: ["install", pkg] };
  }
  if (platform() === "linux") {
    if (which("apt-get")) return { manager: "sudo", args: ["apt-get", "install", "-y", pkg] };
    if (which("dnf")) return { manager: "sudo", args: ["dnf", "install", "-y", pkg] };
    if (which("pacman")) return { manager: "sudo", args: ["pacman", "-S", "--noconfirm", pkg] };
  }
  return null;
}

function autoInstall(cmd: string): boolean {
  const plan = installPlan(cmd);
  if (!plan) {
    console.error(`✗ Missing required command: ${cmd} (could not detect a package manager — install it manually)`);
    return false;
  }
  console.log(`! ${cmd} not found — installing via ${plan.manager}...`);
  const result = spawnSync(plan.manager, plan.args, { stdio: "inherit" });
  if (result.status !== 0 || !which(cmd)) {
    console.error(`✗ Failed to install ${cmd}. Install it manually and re-run.`);
    return false;
  }
  console.log(`✓ ${cmd} installed`);
  return true;
}

function checkPrereqs(): boolean {
  const autoInstallable = ["tmux"];
  const required = ["gh", "claude"];
  let ok = true;

  for (const cmd of autoInstallable) {
    if (!which(cmd) && !autoInstall(cmd)) ok = false;
  }

  for (const cmd of required) {
    if (!which(cmd)) {
      console.error(`✗ Missing required command: ${cmd}`);
      ok = false;
    }
  }

  if (!ok) return false;

  const auth = spawnSync("gh", ["auth", "status"], { stdio: "ignore" });
  if (auth.status !== 0) {
    console.error("✗ gh CLI is not authenticated. Run `gh auth login` first.");
    return false;
  }

  return true;
}

function ensureLabels(): void {
  for (const label of LABELS) {
    const result = spawnSync(
      "gh",
      [
        "label",
        "create",
        label.name,
        "--color",
        label.color,
        "--description",
        label.description,
        "--force",
      ],
      { stdio: "ignore" },
    );
    if (result.status === 0) {
      console.log(`✓ label ${label.name}`);
    } else {
      console.log(`! could not create label ${label.name} (continuing)`);
    }
  }
}

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

function sessionName(): string {
  return `${SESSION_PREFIX}-${basename(process.cwd())}`;
}

function tmuxHasSession(name: string): boolean {
  const result = spawnSync("tmux", ["has-session", "-t", name], { stdio: "ignore" });
  return result.status === 0;
}

function discoverAgents(): string[] {
  const agentsDir = join(process.cwd(), ".mdless", "agents");
  if (!existsSync(agentsDir)) return [];
  return readdirSync(agentsDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3))
    .sort();
}

function startTmux(agents: string[]): void {
  const session = sessionName();
  const cwd = process.cwd();

  if (tmuxHasSession(session)) {
    console.log(`Session ${session} already exists. Attaching...`);
    spawnSync("tmux", ["attach", "-t", session], { stdio: "inherit" });
    return;
  }

  const [first, ...rest] = agents;
  const cmds: string[][] = [
    ["new-session", "-d", "-s", session, "-n", "agents", "-c", cwd],
    ["set-option", "-t", session, "mouse", "on"],
    ["send-keys", "-t", session, `mdless agent ${first}`, "C-m"],
  ];
  for (const name of rest) {
    cmds.push(["split-window", "-h", "-t", session, "-c", cwd]);
    cmds.push(["send-keys", "-t", session, `mdless agent ${name}`, "C-m"]);
  }
  cmds.push(["select-layout", "-t", session, "even-horizontal"]);

  for (const args of cmds) {
    const result = spawnSync("tmux", args, { stdio: "inherit" });
    if (result.status !== 0) {
      console.error(`tmux ${args.join(" ")} failed`);
      process.exit(1);
    }
  }

  console.log(
    `\n✓ tmux session ${session} started with ${agents.length} agent${agents.length === 1 ? "" : "s"}: ${agents.join(", ")}`,
  );
  console.log(`  Attaching... (detach with Ctrl-b d, kill with: tmux kill-session -t ${session})\n`);
  spawnSync("tmux", ["attach", "-t", session], { stdio: "inherit" });
}

function playStartupSound(): void {
  const audioPath = join(import.meta.dirname!, "..", "..", "assets", "ready-to-work.mp3");
  if (!existsSync(audioPath)) return;

  const player = platform() === "darwin" ? "afplay" : platform() === "linux" ? "mpg123" : null;
  if (!player || !which(player)) return;

  spawn(player, [audioPath], { stdio: "ignore", detached: true }).unref();
}

export async function startCommand(): Promise<void> {
  if (!existsSync(join(process.cwd(), ".git"))) {
    console.error("✗ mdless work must be run inside a git repository.");
    process.exit(1);
  }

  let agents = discoverAgents();
  if (agents.length === 0) {
    console.log("! no agent prompts found in .mdless/agents/");
    const shouldInit = await withExitHandler(
      confirm({
        message: "Run `mdless init` to copy the default prompts?",
        default: true,
      }),
    );
    if (!shouldInit) {
      process.exit(1);
    }
    await initCommand();
    agents = discoverAgents();
    if (agents.length === 0) {
      console.error("✗ init ran but no prompts were found. Aborting.");
      process.exit(1);
    }
  }

  if (!checkPrereqs()) {
    process.exit(1);
  }

  ensureLabels();
  ensureGitignore();
  mkdirSync(join(process.cwd(), ".mdless", "logs"), { recursive: true });
  mkdirSync(join(process.cwd(), ".mdless", "worktrees"), { recursive: true });

  playStartupSound();
  startTmux(agents);
}
