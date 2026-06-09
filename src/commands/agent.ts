import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, createWriteStream } from "node:fs";
import { join } from "node:path";
import { playStartupSound } from "../playStartupSound.js";

const SLEEP_SECONDS = 60;

function timestamp(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

function loadPrompt(name: string): string {
  const promptPath = join(process.cwd(), ".mdless", "agents", `${name}.md`);
  if (!existsSync(promptPath)) {
    console.error(
      `✗ no prompt found at ${promptPath}\n  run \`mdless init\` to create the default prompts.`,
    );
    process.exit(1);
  }
  return readFileSync(promptPath, "utf8");
}

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const ITALIC = "\x1b[3m";

// Purple palette (256-color, Gemini-inspired)
const VIOLET = "\x1b[38;5;141m"; // primary
const LAVENDER = "\x1b[38;5;147m"; // soft accent
const DEEP_PURPLE = "\x1b[38;5;99m"; // search/grep
const PINK_PURPLE = "\x1b[38;5;177m"; // writes/edits
const MAGENTA_PURPLE = "\x1b[38;5;171m"; // task/agent
const PALE = "\x1b[38;5;153m"; // web
const SOFT_PINK = "\x1b[38;5;211m"; // errors (still readable)

const TOOL_COLORS: Record<string, string> = {
  Bash: VIOLET,
  Read: LAVENDER,
  Write: PINK_PURPLE,
  Edit: PINK_PURPLE,
  MultiEdit: PINK_PURPLE,
  Glob: DEEP_PURPLE,
  Grep: DEEP_PURPLE,
  WebFetch: PALE,
  WebSearch: PALE,
  Task: MAGENTA_PURPLE,
};

const AGENT_COLOR = VIOLET;

function toolColor(name: string): string {
  return TOOL_COLORS[name] ?? VIOLET;
}

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

function indent(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line) => prefix + line)
    .join("\n");
}

function formatStreamEvent(line: string): string | null {
  let evt: any;
  try {
    evt = JSON.parse(line);
  } catch {
    return line + "\n";
  }

  if (evt.type === "system" && evt.subtype === "init") {
    const session = (evt.session_id ?? "?").toString().slice(0, 8);
    const tools = Array.isArray(evt.tools) ? evt.tools.length : 0;
    return `${DIM}  session ${session} · ${tools} tools loaded${RESET}\n\n`;
  }

  if (evt.type === "assistant" && evt.message?.content) {
    const out: string[] = [];
    for (const block of evt.message.content) {
      if (block.type === "text" && block.text?.trim()) {
        out.push("\n" + indent(block.text.trim(), "  ") + "\n");
      } else if (block.type === "tool_use") {
        const summary = summarizeToolInput(block.name, block.input);
        const color = toolColor(block.name);
        out.push(`  ${color}▸${RESET} ${color}${block.name.padEnd(9)}${RESET} ${summary}`);
      } else if (block.type === "thinking" && block.thinking?.trim()) {
        out.push(`  ${DIM}${ITALIC}~ ${truncate(block.thinking, 200)}${RESET}`);
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
        const arrow = block.is_error ? `${SOFT_PINK}└─ ✗${RESET}` : `${DIM}└─${RESET}`;
        out.push(`  ${arrow} ${DIM}${summary}${RESET}`);
      }
    }
    return out.length ? out.join("\n") + "\n" : null;
  }

  if (evt.type === "result") {
    const parts: string[] = [];
    if (evt.num_turns != null) parts.push(`${evt.num_turns} turns`);
    if (evt.duration_ms != null) parts.push(`${(evt.duration_ms / 1000).toFixed(1)}s`);
    if (evt.total_cost_usd != null) parts.push(`$${evt.total_cost_usd.toFixed(4)}`);
    const color = evt.is_error ? SOFT_PINK : LAVENDER;
    const mark = evt.is_error ? "✗" : "✓";
    return `\n  ${color}${mark}${RESET} ${DIM}${parts.join(" · ")}${RESET}\n`;
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
  playStartupSound();

  const prompt = loadPrompt(name);

  const logDir = join(process.cwd(), ".mdless", "logs");
  mkdirSync(logDir, { recursive: true });
  const logStream = createWriteStream(join(logDir, `${name}.log`), { flags: "a" });

  const titleColor = AGENT_COLOR;
  const banner =
    `\n${titleColor}${BOLD}  ✦ mdless · ${name}${RESET}\n` +
    `${DIM}  ${"─".repeat(40)}${RESET}\n` +
    `${DIM}  loop every ${SLEEP_SECONDS}s · logs in .mdless/logs/${name}.log${RESET}\n`;
  process.stdout.write(banner);
  logStream.write(banner);

  process.on("SIGINT", () => {
    process.stdout.write(`\n  ${DIM}${name} stopped${RESET}\n`);
    process.exit(0);
  });

  while (true) {
    const header = `\n${DIM}── ${timestamp()} ─────────────────────────────${RESET}\n`;
    process.stdout.write(header);
    logStream.write(header);

    await runClaude(prompt, logStream);

    const footer = `${DIM}  sleeping ${SLEEP_SECONDS}s…${RESET}\n`;
    process.stdout.write(footer);
    logStream.write(footer);

    await sleep(SLEEP_SECONDS);
  }
}
