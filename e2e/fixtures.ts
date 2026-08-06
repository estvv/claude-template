import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test as base, type BrowserContext, type Page } from "@playwright/test";
import { E2E_AUTH_SECRET } from "./env";

type World = {
  groupId: string;
  inviteCode: string;
  raceId: string;
  estimatingId: string;
  personalId: string;
  pendingProofId: string;
  raceBetId: string;
  ownerId: string;
  memberId: string;
  tokens: { owner: string; member: string; outsider: string };
};

export const world: World = JSON.parse(
  readFileSync(path.join(process.cwd(), "e2e", ".world.json"), "utf8"),
);

/**
 * Restores the seeded world. Call it in `beforeAll` of any spec file that
 * mutates shared state, otherwise earlier files leak into later ones — the E2E
 * database is not reset between tests.
 *
 * Runs as a child process because Playwright loads spec files as CommonJS,
 * which cannot import the ESM Prisma client. Safe to replay: every seeded id
 * and session token is fixed, so `world` stays accurate.
 */
export function reseed() {
  execFileSync("npx", ["tsx", "e2e/seed.ts"], {
    stdio: "ignore",
    env: {
      ...process.env,
      DATABASE_URL: `file:${path.join(process.cwd(), "prisma", "e2e.db")}`,
      AUTH_SECRET: E2E_AUTH_SECRET,
    },
  });
}

/**
 * Discord's OAuth flow can't run headlessly, so a session cookie encoded
 * offline (same `AUTH_SECRET`, see `e2e/seed.ts`) stands in for a completed
 * sign-in — Auth.js sessions are JWT-based, so it can't tell the difference.
 */
export async function signIn(
  context: BrowserContext,
  who: keyof World["tokens"],
) {
  await context.addCookies([
    {
      name: "authjs.session-token",
      value: world.tokens[who],
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

type Fixtures = {
  ownerPage: Page;
  memberPage: Page;
  outsiderPage: Page;
};

export const test = base.extend<Fixtures>({
  ownerPage: async ({ context, page }, use) => {
    await signIn(context, "owner");
    await use(page);
  },
  memberPage: async ({ context, page }, use) => {
    await signIn(context, "member");
    await use(page);
  },
  outsiderPage: async ({ context, page }, use) => {
    await signIn(context, "outsider");
    await use(page);
  },
});

export { expect } from "@playwright/test";
