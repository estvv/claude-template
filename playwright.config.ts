import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { E2E_AUTH_SECRET } from "./e2e/env";

const root = process.cwd();
const E2E_DB = `file:${path.join(root, "prisma", "e2e.db")}`;
const PORT = 3100;

/**
 * The E2E suite drives a real production build against its own database, so it
 * never touches `dev.db` and exercises the same code path as the VPS.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "line" : "list",
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // The product ships as a PWA, so the phone layout is a first-class target.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next start --port ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_DB,
      AUTH_SECRET: E2E_AUTH_SECRET,
      AUTH_DISCORD_ID: "e2e",
      AUTH_DISCORD_SECRET: "e2e",
      UPLOAD_DIR: path.join(root, "e2e", ".uploads"),
    },
  },
});
