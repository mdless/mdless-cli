import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, createWriteStream } from "node:fs";
import { join } from "node:path";

const AGENTS = ["watcher", "executor", "reviewer"] as const;
export type AgentName = (typeof AGENTS)[number];

const DEFAULT_SLEEP_SECONDS: Record<AgentName, number> = {
  watcher: 300,
  executor: 60,
  reviewer: 120,
};

function isAgentName(value: string): value is AgentName {
  return (AGENTS as readonly string[]).includes(value);
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function loadPrompt(name: AgentName): string {
  const promptPath = join(
    import.meta.dirname!,
    "..",
    "agents",
    "prompts",
    `${name}.md`,
  );
  return readFileSync(promptPath, "utf8");
}

const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";

function truncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
}

function summarizeToolInput(name: string, input: any): string {
  if (!input || typeof input !== "object") return "";
  switch (name) {
    case "Bash":
      return `$ ${truncate(input.command ?? "", 140)}`;
    case "Read":
      return input.file_path ?? "";
    case "Write":
      return input.file_path ?? "";
    case "Edit":
    case "MultiEdit":
      return input.file_path ?? "";
    case "Glob":
      return input.pattern ?? "";
    case "Grep": {
      const where = input.path ? ` in ${input.path}` : input.glob ? ` (${input.glob})` : "";
      return `"${truncate(input.pattern ?? "", 80)}"${where}`;
    }
    case "WebFetch":
    case "WebSearch":
      return input.url ?? input.query ?? "";
    case "Task":
      return truncate(input.description ?? input.prompt ?? "", 120);
    default: {
      const first = Object.values(input).find((v) => typeof v === "string");
      return typeof first === "string" ? truncate(first, 120) : truncate(JSON.stringify(input), 120);
    }
  }
}

function summarizeToolResult(raw: string, isError: boolean): string {
  if (!raw.trim()) return isError ? "(error, no output)" : "(no output)";
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "(empty)";
  const firstLine = lines[0]!;

  if (firstLine.startsWith("{") || firstLine.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return `[${parsed.length} items]`;
      if (parsed && typeof parsed === "object") {
        const keys = Object.keys(parsed);
        if (keys.length === 0) return "{}";
        return `{${keys.slice(0, 4).join(", ")}${keys.length > 4 ? ", …" : ""}}`;
      }
    } catch {}
  }

  const extra = lines.length > 1 ? ` (+${lines.length - 1} lines)` : "";
  return truncate(firstLine, 140) + extra;
}

function formatStreamEvent(line: string): string | null {
  let evt: any;
  try {
    evt = JSON.parse(line);
  } catch {
    return line + "\n";
  }

  if (evt.type === "system" && evt.subtype === "init") {
    const tools = Array.isArray(evt.tools) ? evt.tools.length : 0;
    return `${DIM}[init] session ${(evt.session_id ?? "?").toString().slice(0, 8)} • ${tools} tools${RESET}\n`;
  }

  if (evt.type === "assistant" && evt.message?.content) {
    const out: string[] = [];
    for (const block of evt.message.content) {
      if (block.type === "text" && block.text?.trim()) {
        out.push(`${BOLD}${block.text.trim()}${RESET}`);
      } else if (block.type === "tool_use") {
        const summary = summarizeToolInput(block.name, block.input);
        out.push(`${CYAN}▸ ${block.name.padEnd(8)}${RESET} ${summary}`);
      } else if (block.type === "thinking" && block.thinking?.trim()) {
        out.push(`${DIM}[thinking] ${truncate(block.thinking, 200)}${RESET}`);
      }
    }
    return out.length ? out.join("\n") + "\n" : null;
  }

  if (evt.type === "user" && evt.message?.content) {
    const out: string[] = [];
    for (const block of evt.message.content) {
      if (block.type === "tool_result") {
        const raw = typeof block.content === "string"
          ? block.content
          : Array.isArray(block.content)
            ? block.content.map((c: any) => c.text ?? "").join("\n")
            : "";
        const summary = summarizeToolResult(raw, !!block.is_error);
        const marker = block.is_error ? `${RED}  ✗     ${RESET}` : `${GREEN}  ◂     ${RESET}`;
        out.push(`${marker}${DIM}${summary}${RESET}`);
      }
    }
    return out.length ? out.join("\n") + "\n" : null;
  }

  if (evt.type === "result") {
    const cost = evt.total_cost_usd != null ? ` • $${evt.total_cost_usd.toFixed(4)}` : "";
    const duration = evt.duration_ms != null ? ` • ${(evt.duration_ms / 1000).toFixed(1)}s` : "";
    const turns = evt.num_turns != null ? ` • ${evt.num_turns} turns` : "";
    const color = evt.is_error ? YELLOW : DIM;
    return `${color}[done] ${evt.subtype ?? "ok"}${turns}${duration}${cost}${RESET}\n`;
  }

  return null;
}

function runClaude(prompt: string, logStream: NodeJS.WritableStream): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(
      "claude",
      [
        "-p",
        prompt,
        "--dangerously-skip-permissions",
        "--verbose",
        "--output-format",
        "stream-json",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let buf = "";
    child.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        const formatted = formatStreamEvent(line);
        if (formatted) {
          process.stdout.write(formatted);
          logStream.write(formatted);
        }
      }
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      logStream.write(chunk);
    });
    child.on("error", (err) => {
      const msg = `\n[agent] failed to spawn claude: ${err.message}\n`;
      process.stderr.write(msg);
      logStream.write(msg);
      resolve(1);
    });
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export async function agentCommand(name: string): Promise<void> {
  if (!isAgentName(name)) {
    console.error(`Unknown agent: ${name}. Expected one of: ${AGENTS.join(", ")}`);
    process.exit(1);
  }

  const prompt = loadPrompt(name);
  const sleepSeconds = Number(process.env.MDLESS_SLEEP) || DEFAULT_SLEEP_SECONDS[name];

  const logDir = join(process.cwd(), ".mdless", "logs");
  mkdirSync(logDir, { recursive: true });
  const logStream = createWriteStream(join(logDir, `${name}.log`), { flags: "a" });

  const banner = `\n=== mdless agent: ${name} (sleep ${sleepSeconds}s between loops) ===\n`;
  process.stdout.write(banner);
  logStream.write(banner);

  process.on("SIGINT", () => {
    process.stdout.write(`\n[${name}] stopped\n`);
    process.exit(0);
  });

  while (true) {
    const header = `\n--- [${timestamp()}] ${name}: starting iteration ---\n`;
    process.stdout.write(header);
    logStream.write(header);

    await runClaude(prompt, logStream);

    const footer = `\n--- [${timestamp()}] ${name}: sleeping ${sleepSeconds}s ---\n`;
    process.stdout.write(footer);
    logStream.write(footer);

    await sleep(sleepSeconds);
  }
}
