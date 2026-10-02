/**
 * Production build + zip for manual upload: `npm run build:zip` -> build.zip (contains .next/).
 * Raises the heap limit for this build only; .env's NODE_OPTIONS (384MB) is sized for the
 * server and makes local builds run out of memory. Works the same in cmd, PowerShell and bash.
 */
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const env = { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" };

function run(command) {
  console.log(`\n> ${command}`);
  const result = spawnSync(command, { stdio: "inherit", shell: true, env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

rmSync("build.zip", { force: true });
run("npm run build");
run("npx --yes bestzip build.zip .next/");
console.log("\nbuild.zip ready.");
