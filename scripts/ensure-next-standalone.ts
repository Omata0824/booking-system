import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const nextDir = ".next";
const standaloneDir = join(nextDir, "standalone");

if (!existsSync(nextDir) || existsSync(standaloneDir)) {
  process.exit(0);
}

const candidate = readdirSync(nextDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(nextDir, entry.name))
  .find(
    (path) =>
      existsSync(join(path, "server.js")) &&
      existsSync(join(path, ".next", "server", "pages-manifest.json")),
  );

if (!candidate) {
  process.exit(0);
}

rmSync(standaloneDir, { recursive: true, force: true });
mkdirSync(nextDir, { recursive: true });
cpSync(candidate, standaloneDir, { recursive: true });
