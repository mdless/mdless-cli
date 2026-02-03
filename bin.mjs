#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const tsxPath = require.resolve("tsx");

const result = spawnSync(
  "node",
  [
    "--import",
    tsxPath,
    join(__dirname, "src", "index.ts"),
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" }
);
process.exit(result.status ?? 1);
