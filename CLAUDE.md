# Unlocked

Gamified achievement-tracking app: users complete real-life challenges
validated by their community/group, earn "Karma" points (with a bonus
for finishing first), and can wager "Tokens" on bets about who'll
complete a challenge first. See `docs/IDEAS.md` for the full product
brainstorm.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS v4, Turbopack)
- Prisma 7 + SQLite (`@prisma/adapter-better-sqlite3` driver adapter,
  local `dev.db` file — self-hosted on a VPS, no managed DB)
- Auth.js (`next-auth@beta`): Credentials (username/password) is the
  primary login, Discord OAuth is optional (kept for a future webhook
  use). JWT sessions — required for Credentials, see `src/auth.ts` —
  so `@auth/prisma-adapter` only persists Discord's User/Account rows,
  not sessions
- shadcn/ui (`radix-nova` style, neutral base) + lucide icons
- PWA (no native app, no app stores — see `docs/FEATURES.md` §Mobile):
  `src/app/manifest.ts`, `public/sw.js`, iOS meta tags in
  `src/app/layout.tsx`

**Node 22+ required** (`.nvmrc`) — npm 12, `node-gyp` and Prisma 7 all
refuse Node 20, and `better-sqlite3` then builds against the wrong ABI.

## Commands

| What | Command |
|---|---|
| Install | `npm install` |
| Run in dev | `npm run dev` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| DB migration (dev) | `npm run db:migrate` |
| DB browser | `npm run db:studio` |
| Migrate + seed (prod) | `npm run db:deploy` (snapshots first, aborts if it can't) then `npm run db:seed` — `docker/entrypoint.sh` does both at boot |
| Deploy | push to `main`: CD publishes the image to GHCR and restarts the VPS once CI is green (`README.md` §Deployment) |
| Fixtures (dev, destructive) | `npm run db:fixtures` |
| Regenerate Prisma client | `npx prisma generate` (needed after every `schema.prisma` change; `build` and `postinstall` already run it) |
| Unit + integration tests | `npm test` |
| Browser E2E | `npm run test:e2e` (needs `npx playwright install chromium` once) |

This machine's `~/.npmrc` sets `ignore-scripts=true`, so `npm install`
skips native builds and `postinstall`. Run
`npm rebuild better-sqlite3 --ignore-scripts=false` or every query fails
at runtime — the same trap awaits on the VPS.

## Architecture

- `prisma/schema.prisma` — full domain model. SQLite has no native
  enums, so status/mode columns are `String`; the allowed values live
  as string unions in `src/lib/domain.ts`.
- `src/generated/prisma/` — Prisma client output, **generated**, gitignored.
- `src/lib/prisma.ts` — Prisma client singleton. Prisma 7 requires a
  driver adapter (`new PrismaClient()` with no args no longer works).
- `src/auth.ts` + `src/app/api/auth/[...nextauth]/route.ts` — Auth.js
  config and route handler. `signIn`/`signOut`/`auth` are exported from
  `src/auth.ts` for use in server components/actions. `trustHost: true`
  is **required** for the self-hosted production build — without it
  `auth()` silently returns null and every route redirects to `/login`.
- `src/lib/constants.ts` — every tunable game rule (rank curve, vote
  windows, starting tokens). Balance changes go here, not into actions.
- `src/lib/tick.ts` — time-driven transitions (vote windows closing,
  deadlines lapsing). There is **no cron**: `loadGroupContext()` runs
  the tick lazily on group page loads.
- `src/lib/bets.ts` — pari-mutuel settlement. Stakes are debited when
  placed, so resolution only ever credits; the rounding remainder goes
  to the largest stake to conserve the pot exactly.
- `src/app/(app)/` — everything behind auth, wrapped by the shell
  (sidebar on desktop, bottom tab bar on mobile).
- Uploads live outside `public/` (`UPLOAD_DIR`) and are served through
  `/api/uploads/[name]`, which requires a session.
- `public/sw.js` caches **only** `/_next/static/*` and `/icons/*` — never
  pages or `/api/*`, which are per-user and would outlive a logout. Bump
  `CACHE_VERSION` on any policy change; `activate` drops every other cache,
  so old builds don't pile up on devices. Guarded by `e2e/admin-pwa.spec.ts`.

## Testing

- `tests/` — Vitest. Server actions run for real against a throwaway DB built
  from the migrations. `tests/setup.ts` mocks only the Next.js boundary:
  `redirect()`/`notFound()` throw sentinels, `revalidatePath()` is a no-op,
  `auth()` returns whoever `actAs()` picked.
- `e2e/` — Playwright against a production build and its own DB. Discord OAuth
  can't run headlessly, so `e2e/fixtures.ts` sets an `authjs.session-token`
  cookie encoded offline in `e2e/seed.ts` (same `AUTH_SECRET`, see
  `e2e/env.ts`). Seeded ids are fixed, so `reseed()` can restore
  state in `beforeAll` — the E2E DB is **not** reset between tests, and spec
  files leak into each other without it.
- Both suites run serially on one shared SQLite file each.

## Conventions

- Mutations are **server actions** colocated in `actions.ts` next to
  the routes that use them, not REST route handlers.
- Forms that can fail use `useActionState` with an
  `ActionState = { error: string } | null`; actions return the error
  rather than throwing.
- Identifiers and comments in English, user-facing strings in French.
- Design tokens are the CSS custom properties in `globals.css`
  (`--bg-card`, …); shadcn's variables are rebound onto them. Restyle
  there, not with raw Tailwind colours.
- `requireMembership()` / `loadGroupContext()` gate every group route;
  non-members get a 404, never a 403. **Platform admins are not
  exempt** — their global moderation lives at `/admin/moderation`,
  behind `requireAdmin()`, so group pages stay members-only.

## Sensitive areas

- `.env` / `.env.local` — holds `AUTH_SECRET` and Discord OAuth
  credentials, gitignored. Never commit real secrets; `.env.example`
  documents the required keys with placeholders.
- `prisma/fixtures.ts` — **destructive**, wipes the domain tables.
  Dev only; it refuses to run with `NODE_ENV=production`.

---

# Working rules (provided by the template)

These rules apply to every project derived from this template. The
sections above are specific to this project.

## This file's budget

Keep `CLAUDE.md` **under 200 lines**. This file is read in full at every
session: anything not systematically useful costs context on every turn.
Three destinations depending on the case:

| The content… | goes in |
|---|---|
| applies to every session | `CLAUDE.md` |
| concerns only some files | `.claude/rules/` with `paths:` |
| is only needed on demand / for a procedure | `.claude/skills/<name>/SKILL.md` |

`@file.md` imports **do not reduce** the context: the imported file is
loaded at startup like everything else. Only `paths:` in
`.claude/rules/` actually avoids the cost.

## Path-scoped rules

`.claude/rules/*.md` carries the rules that concern only part of the
repo. The `paths:` frontmatter loads them only when Claude reads a
matching file:

```markdown
---
paths: ["src/api/**/*.ts"]
---
```

A rule **without** `paths:` is loaded at every session — same cost as
`CLAUDE.md`, so reserve it for what applies everywhere (see `git.md`
and `good-practices.md`).
Every `.md` file in the folder is discovered recursively: don't drop
documentation files there, they would be loaded as rules.

## Architecture decisions

An engaging decision produces two things: the **why** in
`docs/adr/000N-*.md` (never loaded automatically), and, if it
constrains future code, the **what to do** in 1-2 lines in
`.claude/rules/<area>.md` that cites the ADR without copying it.

**All ADRs live in the root `docs/adr/`, flat** — including in a
monorepo. We colocate what loads lazily (`CLAUDE.md`, skills) and
centralize what never loads. One directory means one numbering, so
`ADR-000N` stays unambiguous; a decision scoped to one sub-project says
so in its title.

**Never read ADRs in bulk** — on a mature project, that's thousands of
tokens for rarely relevant decisions. For a "why is it done this way":
`ls docs/adr/` (descriptive names), open the single one that answers.
Look there **before** re-reading code to reconstruct an intent.

An ADR is never re-edited: a new ADR replaces it. See `writing-adrs`.

## Skills and subagents

- Skills live in `.claude/skills/<name>/SKILL.md`, **a single level of
  folder nesting**. A skill nested deeper is silently ignored by Claude
  Code.
- In the **root** `.claude/skills/`, skills specific to this repo are
  named `project-<name>`. Those **without** a prefix are the common
  foundation shared by all projects: don't modify them — to specialize,
  create a `project-<name>` alongside.
- A skill that only concerns one sub-project goes in
  `<sub-project>/.claude/skills/<name>/` instead, with no prefix: its
  location already says which project owns it, and it loads only when
  Claude works in that sub-project.
- A root skill that only applies to certain files should carry a
  `paths:` frontmatter rather than rely on its description. Claude picks
  a skill by reading every discovered skill's description, and
  descriptions get **truncated when there are many** — `paths:` keeps the
  skill out of that list until it is relevant.
- Don't create a skill for a pattern seen only once. The criteria are in
  `.claude/skills/bootstrap-project/references/signal-catalog.md`.

## Delegation

- `explorer` — for any question that would require reading many files
  for a short answer. Preserves the main session's context.
- `code-reviewer` — after any non-trivial change, before committing.
- `test-writer` — to test code that is already stable, not mid-design.