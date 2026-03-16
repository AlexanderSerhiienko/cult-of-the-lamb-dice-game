import { spawnSync } from "node:child_process";

if (process.env.SKIP_PRISMA_GENERATE === "1") {
  console.log("[postinstall] skipping prisma generate");
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "generate"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
