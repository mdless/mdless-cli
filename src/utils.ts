import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function exit(): never {
  console.log("\nAborted.");
  process.exit(0);
}

export function getDirectories(path: string): string[] {
  return readdirSync(path).filter((name) =>
    statSync(join(path, name)).isDirectory()
  );
}

export function withExitHandler<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((e: Error) => {
    if (e.name === "ExitPromptError") exit();
    throw e;
  });
}
