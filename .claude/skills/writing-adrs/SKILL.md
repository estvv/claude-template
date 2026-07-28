---
name: writing-adrs
description: >
  Writes an ADR (Architecture Decision Record) in docs/adr/ from the
  template docs/adr/0000-template.md, when a structuring architecture
  decision has just been made or discussed (technology choice, change
  in service split, dropping an option). Use this skill PROACTIVELY as
  soon as a conversation leads to an engaging technical choice, even if
  the user doesn't explicitly ask for an ADR — never propose creating
  the ADR without confirming with them first.
---

# Writing ADRs

## When to trigger

- A discussion just led to an engaging technical choice (technology,
  major library, service split, dropping an alternative)
- The user explicitly says "note this decision" / "write an ADR"
- A `CLAUDE.md` or a conversation mentions a non-trivial constraint ("we
  decided to never…") that isn't traced anywhere

## What an ADR is NOT

- Not meeting minutes
- Not general architecture doc (see the discussion: ARCHITECTURE.md was
  deliberately excluded from this template, too perishable)
- Not re-edited after the fact — if it becomes obsolete, a new ADR
  replaces it; we don't rewrite history

## Workflow

1. Check the next number in `docs/adr/` (`000N-`)
2. Copy `docs/adr/0000-template.md` to `docs/adr/000N-short-title.md`
3. Fill only Context / Decision / Alternatives / Consequences — don't
   leave a section empty, mark "not applicable" if needed
4. Initial status: "Proposed" if the decision isn't yet enacted,
   "Accepted" if it is
5. **Confirm with the user before creating the file** — a poorly
   worded ADR lingering in the repo is worse than no ADR
6. Once the ADR is created, apply the step below: an ADR alone is an
   archive that no one will re-read at the right time.

## Produce the constraint, not just the archive

An ADR answers "why". It is never loaded automatically — so an agent
writing code in six months won't see it. If the decision **constrains
future code on an identifiable area of the repo**, it must also
produce an active line:

1. Identify the concerned area (`src/api/`, migrations, the
   frontend…). If the decision constrains no specific area (tooling
   choice, organizational decision), stop there: the ADR is enough.
2. Create or complete `.claude/rules/<area>.md` with a targeted `paths:`.
3. Write **one or two imperative lines** there that reference the ADR:

```markdown
---
paths: ["src/api/**/*.ts"]
---
- Every endpoint response goes through `wrapResponse()`, cf. ADR-0007.
```

The rule carries the *what to do*, the ADR carries the *why*. An agent
touching `src/api/` receives the constraint without opening a single
ADR; it opens 0007 only if it needs to contest it.

## What you NEVER do

- Create an ADR without explicit confirmation from the user
- Re-edit an existing ADR instead of creating a new one that replaces it
- Fill a section with a guess — ask rather than invent the "why" of a
  past decision
- **Copy the ADR's content into the rule.** The two would drift, and it
  would charge the archive to every session — exactly what the
  separation avoids. The rule cites the ADR, it doesn't summarize it.
- Add an ADR index to `CLAUDE.md`: the cost loaded at every session
  must stay constant regardless of the number of ADRs. `ls docs/adr/`
  is enough when the question arises.