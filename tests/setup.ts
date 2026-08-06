import { beforeEach, afterAll, vi } from "vitest";
import { rmSync } from "node:fs";
import { resetDb, disconnect } from "./db";
import { sessionState } from "./mocks";

// Next's cache invalidation is a no-op outside a request; the actions call it
// unconditionally, so it has to exist.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// `redirect()` and `notFound()` signal control flow by throwing in Next too, so
// modelling them as throws keeps the actions' behaviour intact.
vi.mock("next/navigation", async () => {
  const { RedirectError, NotFoundError } = await import("./mocks");
  return {
    redirect: (url: string) => {
      throw new RedirectError(url);
    },
    notFound: () => {
      throw new NotFoundError();
    },
  };
});

// The whole auth layer reduces to "who is the caller", which each test sets.
vi.mock("@/auth", async () => {
  const { sessionState: state } = await import("./mocks");
  return {
    auth: async () => (state.user ? { user: state.user } : null),
    signIn: vi.fn(),
    signOut: vi.fn(),
    handlers: { GET: vi.fn(), POST: vi.fn() },
  };
});

beforeEach(async () => {
  sessionState.user = null;
  await resetDb();
});

afterAll(async () => {
  await disconnect();
  rmSync(process.env.UPLOAD_DIR!, { recursive: true, force: true });
});
