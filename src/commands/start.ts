import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { basename, join } from "node:path";
import { platform } from "node:os";

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
    description: "Approved by the mdless reviewer agent",
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
  const optional = ["sentry-cli"];
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
  for (const cmd of optional) {
    if (!which(cmd)) {
      console.log(`! Optional command not found: ${cmd} (watcher will skip this source)`);
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

function ensureGitignore(): void {
  const gitignore = join(process.cwd(), ".gitignore");
  const entry = ".mdless/";
  if (!existsSync(gitignore)) {
    appendFileSync(gitignore, `${entry}\n`);
    console.log(`✓ created .gitignore with ${entry}`);
    return;
  }
  const content = readFileSync(gitignore, "utf8");
  if (!content.split("\n").some((line) => line.trim() === entry || line.trim() === ".mdless")) {
    appendFileSync(gitignore, `${content.endsWith("\n") ? "" : "\n"}${entry}\n`);
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

function startTmux(): void {
  const session = sessionName();
  const cwd = process.cwd();

  if (tmuxHasSession(session)) {
    console.log(`Session ${session} already exists. Attaching...`);
    spawnSync("tmux", ["attach", "-t", session], { stdio: "inherit" });
    return;
  }

  const cmds: string[][] = [
    ["new-session", "-d", "-s", session, "-n", "agents", "-c", cwd],
    ["set-option", "-t", session, "mouse", "on"],
    ["send-keys", "-t", session, "mdless agent watcher", "C-m"],
    ["split-window", "-h", "-t", session, "-c", cwd],
    ["send-keys", "-t", session, "mdless agent executor", "C-m"],
    ["split-window", "-h", "-t", session, "-c", cwd],
    ["send-keys", "-t", session, "mdless agent reviewer", "C-m"],
    ["select-layout", "-t", session, "even-horizontal"],
  ];

  for (const args of cmds) {
    const result = spawnSync("tmux", args, { stdio: "inherit" });
    if (result.status !== 0) {
      console.error(`tmux ${args.join(" ")} failed`);
      process.exit(1);
    }
  }

  console.log(`\n✓ tmux session ${session} started with 3 agents`);
  console.log(`  Attaching... (detach with Ctrl-b d, kill with: tmux kill-session -t ${session})\n`);
  spawnSync("tmux", ["attach", "-t", session], { stdio: "inherit" });
}

export async function startCommand(): Promise<void> {
  if (!existsSync(join(process.cwd(), ".git"))) {
    console.error("✗ mdless work must be run inside a git repository.");
    process.exit(1);
  }

  if (!checkPrereqs()) {
    process.exit(1);
  }

  ensureLabels();
  ensureGitignore();
  mkdirSync(join(process.cwd(), ".mdless", "logs"), { recursive: true });
  mkdirSync(join(process.cwd(), ".mdless", "worktrees"), { recursive: true });

  startTmux();
}
