import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { platform } from "node:os";

function which(cmd: string): boolean {
  const result = spawnSync("which", [cmd], { stdio: "ignore" });
  return result.status === 0;
}

export function playStartupSound(): void {
  const audioPath = join(import.meta.dirname!, "..", "assets", "ready-to-work.mp3");
  if (!existsSync(audioPath)) return;

  const player = platform() === "darwin" ? "afplay" : platform() === "linux" ? "mpg123" : null;
  if (!player || !which(player)) return;

  spawn(player, [audioPath], { stdio: "ignore", detached: true }).unref();
}
