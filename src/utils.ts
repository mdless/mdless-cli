import { homedir } from "node:os";

export function exit(): never {
  console.log("\nAborted.");
  process.exit(0);
}

export function withExitHandler<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((e: Error) => {
    if (e.name === "ExitPromptError") exit();
    throw e;
  });
}

export function truncatePath(path: string, maxLength = 50): string {
  const home = homedir();
  let display = path.startsWith(home) ? path.replace(home, "~") : path;
  if (display.length > maxLength) {
    display = "..." + display.slice(-maxLength + 3);
  }
  return display;
}

export function clearLine(): void {
  process.stdout.write("\r\x1b[K");
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
