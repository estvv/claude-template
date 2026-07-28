# <Project name>

<One to two sentences: what this project does and for whom. Replaced at
bootstrap time — see the `bootstrap-project` skill.>

## Sub-projects

<Delete this section in a single-project repo.>

<In a monorepo, this file's job is to **orient**, not to describe every
stack. One line per sub-project: what it is, and where its commands run.
Stack, commands and conventions of a sub-project belong in its own
`<sub-project>/CLAUDE.md`, which loads on demand when Claude reads a file
there — not in this file, which is paid for at every session.>

| Sub-project | What it is |
|---|---|
| `<dir>/` | `<one line>` |

## Stack

<Only the technologies that change how code is written here. Not the
dependency list. In a monorepo: only what is shared across sub-projects.>

## Commands

| What | Command |
|---|---|
| Install | `<...>` |
| Run in dev | `<...>` |
| Test | `<...>` |
| Test a single file | `<...>` |
| Lint / format | `<...>` |
| Build | `<...>` |

## Architecture

<The non-obvious layout: what a newcomer wouldn't guess from listing the
folders. Don't describe `src/`.>

## Conventions

<The rules actually enforced in this repo, not generic best practices.
e.g. "every API route returns through `wrapResponse()`.">

## Sensitive areas

<Files/folders that should not be modified without explicit validation,
and why. Leave empty if none.>

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
`CLAUDE.md`, so reserve it for what applies everywhere (see `git.md`).
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