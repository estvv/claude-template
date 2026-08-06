/**
 * Mutable state and sentinel errors shared between the Vitest setup mocks and
 * the tests. Lives in its own module because `vi.mock` factories are hoisted
 * and cannot close over test-file variables.
 */

export type TestSessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isPlatformAdmin: boolean;
};

export const sessionState: { user: TestSessionUser | null } = { user: null };

/** Thrown by the mocked `redirect()` so a test can assert where it went. */
export class RedirectError extends Error {
  constructor(public url: string) {
    super(`REDIRECT:${url}`);
    this.name = "RedirectError";
  }
}

/** Thrown by the mocked `notFound()`. */
export class NotFoundError extends Error {
  constructor() {
    super("NOT_FOUND");
    this.name = "NotFoundError";
  }
}
