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
- Auth.js (`next-auth@beta`) with the Discord OAuth provider only,
  `@auth/prisma-adapter` for session/user persistence
- PWA (no native app, no app stores — see `docs/FEATURES.md` §Mobile):
  `src/app/manifest.ts`, `public/sw.js`, iOS meta tags in
  `src/app/layout.tsx`

## Commands

| What | Command |
|---|---|
| Install | `npm install` |
| Run in dev | `npm run dev` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| DB migration (dev) | `npx prisma migrate dev` |
| DB browser | `npx prisma studio` |
| Regenerate Prisma client | `npx prisma generate` (needed after every `schema.prisma` change) |

No test runner is set up yet.

## Architecture

- `prisma/schema.prisma` — data model. Currently only the Auth.js
  adapter models (`User`, `Account`, `Session`, `VerificationToken`);
  product models (achievements, groups, bets…) still to be designed.
- `src/generated/prisma/` — Prisma client output, **generated, not
  edited by hand**, gitignored.
- `src/lib/prisma.ts` — Prisma client singleton (dev hot-reload safe).
- `src/auth.ts` + `src/app/api/auth/[...nextauth]/route.ts` — Auth.js
  config and route handler. `signIn`/`signOut`/`auth` are exported from
  `src/auth.ts` for use in server components/actions.
- Prisma 7 requires a driver adapter (`new PrismaClient()` with no
  args no longer works) — see `src/lib/prisma.ts` for the SQLite one.

## Conventions

<Not enough code yet to have established conventions — revisit once
the first feature lands.>

## Sensitive areas

- `.env` / `.env.local` — holds `AUTH_SECRET` and Discord OAuth
  credentials, gitignored. Never commit real secrets; `.env.example`
  documents the required keys with placeholders.

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