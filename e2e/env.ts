/**
 * Shared between playwright.config.ts (the server it spawns) and the seed
 * scripts (which encode session JWTs offline) — both must sign with the same
 * secret for the seeded cookies to decode.
 */
export const E2E_AUTH_SECRET = "e2e-secret-not-used-for-real-sessions";
