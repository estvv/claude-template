import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

const TEST_DB = path.join(process.cwd(), "prisma", "test.db");

/**
 * Builds a throwaway database from the migration history once per run, so the
 * suite exercises exactly the schema that would be deployed — not a
 * `db push` approximation of it.
 */
export default function setup() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(`${TEST_DB}${suffix}`, { force: true });
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB}` },
  });

  return () => {
    for (const suffix of ["", "-journal", "-wal", "-shm"]) {
      rmSync(`${TEST_DB}${suffix}`, { force: true });
    }
  };
}
