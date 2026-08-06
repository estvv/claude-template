import path from "node:path";
import { defineConfig } from "vitest/config";

const root = process.cwd();
const TEST_DB = path.join(root, "prisma", "test.db");

export default defineConfig({
  // The `@/…` alias is declared here rather than through vite-tsconfig-paths,
  // which walks the whole filesystem looking for tsconfigs.
  resolve: {
    alias: { "@": path.join(root, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // Point the app's Prisma singleton at a throwaway database, and keep
    // uploaded fixtures out of the real uploads directory.
    env: {
      DATABASE_URL: `file:${TEST_DB}`,
      UPLOAD_DIR: path.join(root, "tests", ".uploads"),
      NODE_ENV: "test",
    },
    // The suites share one SQLite file; running them in parallel would have
    // them truncating each other's rows between tests.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
