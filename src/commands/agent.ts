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

function formatStreamEvent(line: string): string | null {
  let evt: any;
  try {
    evt = JSON.parse(line);
  } catch {
    return line + "\n";
  }

  if (evt.type === "system" && evt.subtype === "init") {
    const tools = Array.isArray(evt.tools) ? evt.tools.length : 0;
    return `\x1b[2m[init] session ${evt.session_id ?? "?"} • ${tools} tools available\x1b[0m\n`;
  }

  if (evt.type === "assistant" && evt.message?.content) {
    const out: string[] = [];
    for (const block of evt.message.content) {
      if (block.type === "text" && block.text) {
        out.push(block.text);
      } else if (block.type === "tool_use") {
        const inputPreview = JSON.stringify(block.input ?? {}).slice(0, 200);
        out.push(`\x1b[36m▸ ${block.name}\x1b[0m \x1b[2m${inputPreview}\x1b[0m`);
      } else if (block.type === "thinking" && block.thinking) {
        out.push(`\x1b[2m[thinking] ${block.thinking.slice(0, 200)}\x1b[0m`);
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
            ? block.content.map((c: any) => c.text ?? "").join("")
            : "";
        const preview = raw.replace(/\s+/g, " ").slice(0, 200);
        const marker = block.is_error ? "\x1b[31m✗" : "\x1b[32m◂";
        out.push(`${marker}\x1b[0m \x1b[2m${preview}\x1b[0m`);
      }
    }
    return out.length ? out.join("\n") + "\n" : null;
  }

  if (evt.type === "result") {
    const cost = evt.total_cost_usd != null ? ` • $${evt.total_cost_usd.toFixed(4)}` : "";
    const duration = evt.duration_ms != null ? ` • ${(evt.duration_ms / 1000).toFixed(1)}s` : "";
    const turns = evt.num_turns != null ? ` • ${evt.num_turns} turns` : "";
    return `\x1b[2m[done] ${evt.subtype ?? "ok"}${turns}${duration}${cost}\x1b[0m\n`;
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
