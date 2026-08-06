import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { E2E_AUTH_SECRET } from "./env";

const E2E_DB_PATH = path.join(process.cwd(), "prisma", "e2e.db");
const E2E_DB_URL = `file:${E2E_DB_PATH}`;

/**
 * Prepares the E2E database and a production bundle before Playwright starts
 * the server.
 *
 * Migration and seeding run as child processes: Playwright loads this file as
 * CommonJS, which cannot import the ESM Prisma client.
 */
export default function globalSetup() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(`${E2E_DB_PATH}${suffix}`, { force: true });
  }

  const env = {
    ...process.env,
    DATABASE_URL: E2E_DB_URL,
    AUTH_SECRET: E2E_AUTH_SECRET,
  };

  execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env });
  execFileSync("npx", ["tsx", "e2e/seed.ts"], { stdio: "inherit", env });

  // `next start` needs an existing build; doing it here keeps the webServer
  // command a plain start whose timeout doesn't have to cover a compile.
  execFileSync("npx", ["next", "build"], { stdio: "inherit", env });
}
