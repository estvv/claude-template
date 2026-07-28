---
name: bootstrap-project
description: >
  Adapts this generic template to a real project: scans the codebase,
  fills CLAUDE.md with detected facts, then proposes project-specific
  skill/subagent candidates based on concrete signals (never invented).
  Use this skill as soon as the user has just copied this template onto
  a new project, asks "adapt the template to this repo", "onboard me on
  this project", or "which skills to create for this repo", even without
  mentioning "bootstrap" explicitly.
---

# Bootstrap Project

Two phases, strictly separated. Phase 1 is reliable and can run alone.
Phase 2 ONLY makes proposals — nothing is created without the user's
explicit validation.

## Phase 1 — CLAUDE.md generation (reliable, automatable)

1. Run `bash .claude/skills/bootstrap-project/scripts/scan_repo.sh` to
   collect signals without blind exploration (stack, structure, CI,
   existing docs, git history)
2. If a `CLAUDE.md` already exists: read it first and **enrich** it,
   never overwrite instructions already present. Clearly mark what was
   added.
3. Fill the stack/commands/architecture/conventions sections from the
   detected facts — no invention. If a fact is not deducible from the
   scan (e.g. "why Postgres"), leave a placeholder rather than guessing.
4. Keep the file under 200 lines (see the rule in CLAUDE.md itself)
5. If the project already has ADRs: the scan lists only their **titles**.
   Open only those whose title touches an area active in the current
   work — never all of them. And don't summarize them in `CLAUDE.md`:
   a decision that constrains future code becomes a **path-scoped rule**
   that cites the ADR (see the `writing-adrs` skill), not a paragraph
   paid for at every session.

Common mistakes to avoid:
- Listing all dependencies instead of only those that influence how
  code is written
- Describing obvious folder names (`src/` needs no explanation)
- Copying the README instead of adding real structural value

## Phase 2 — Proposing skill/subagent candidates (never automatic)

1. Read `references/signal-catalog.md` for the full detection and
   scoring grid — don't improvise the criteria
2. Analyze the signals collected in phase 1 (and dig deeper with
   targeted grep/read if needed) looking for recurring, non-obvious
   patterns
3. Rank each candidate using the format defined in signal-catalog.md
   (name, proof, score, type, description)
4. Choose the right destination for each retained candidate:
   - a convention that only concerns a part of the repo (`src/api/`,
     the frontend, migrations…) → **path-scoped rule** in
     `.claude/rules/<topic>.md` with a `paths:` frontmatter, not a
     skill. This is the only mechanism that costs context only if the
     area is touched.
   - a multi-step procedure triggered on demand → skill
   - delegable work in an isolated context → subagent
   Don't bloat `CLAUDE.md` with what fits in the first two.
5. The template ships **only** `git.md`, deliberately: a generic rule on
   tests or code style encodes framework knowledge Claude already has,
   and would be dead weight in every derived project. Rules beyond
   `git.md` are derived here, from this repo:
   - from the scan and targeted reads — an actually enforced convention,
     a repeated pattern, a recurring mistake in the git history;
   - by **asking the user** what a generic scan cannot know: which areas
     are fragile, which mistake keeps coming back in review, which rule
     is applied without being written down anywhere.
   Never propose a rule that merely restates a language or framework
   best practice — that's a weak signal (see signal-catalog.md).
6. Present the list sorted by score to the user — skill candidates,
   rule candidates, subagent candidates, and refactor candidates (not
   skills) in separate sections
7. For each candidate validated by the user: create the file in
   `.claude/skills/project-<name>/SKILL.md`, `.claude/rules/<topic>.md`
   or `.claude/agents/<name>.md` depending on the type. Two constraints
   on skills:
   - **`project-` prefix mandatory** — it makes what is specific to the
     repo visible in an `ls`, as opposed to the template's foundation
     which carries none (cf. ADR-0001);
   - **a single level of folder under `skills/`** — Claude Code only
     discovers `.claude/skills/<name>/SKILL.md`; a skill nested deeper
     is silently ignored.
8. Create nothing for non-validated candidates

## What this skill never does

- Create a skill/agent file without explicit validation
- Modify a skill **without** a `project-` prefix — that's the common
  foundation shared by all projects. To specialize it, create a
  `project-<name>` alongside.
- Overwrite instructions already present in CLAUDE.md
- Propose a skill for a pattern seen only once (see weak signals in
  signal-catalog.md)

## Reference files

- `references/signal-catalog.md` — full detection and scoring grid for
  candidates, to read before phase 2
- `scripts/scan_repo.sh` — deterministic collection, to run in phase 1