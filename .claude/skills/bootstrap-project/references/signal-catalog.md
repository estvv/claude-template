# Signal catalog — skill/subagent candidates

A skill is valuable only if it encodes knowledge that Claude CANNOT
deduce by reading the code once. So we look for signals of
**recurrence + non-obviousness**, never just one of the two.

## Strong signals (prioritize)

- **Pattern repeated ≥3 times** with slight variations between
  occurrences → proof it isn't automated, hence a source of
  inconsistency/bugs. e.g. each API route has a slightly different
  try/catch wrapper.
- **Internal or little-known lib/SDK** used with non-standard call
  patterns — Claude doesn't know it from its training.
- **Underused shared fixtures**: some tests reinvent them instead of
  reusing them → existing but undocumented convention.
- **Multi-step manual procedure documented in prose** in
  README/CONTRIBUTING/docs (release, migration, deployment) never
  captured as an executable skill.
- **Recurring "fix: forgot to..." commits** on the same error category
  (via git log) → the skill can encode the missing rule so this mistake
  stops recurring.
- **Precise CI steps** (command order, env variables) not deducible
  from the application code alone.

## Weak signals to explicitly ignore

- Normal usage of an ultra-standard lib (e.g. basic Express, basic React)
- General knowledge of the language/framework — Claude already has it
- A pattern seen only once — not yet a convention, just a one-off
  choice

## Classify the candidate: rule, skill, or refactor

A detected inconsistency isn't automatically a skill candidate. Three
possible outcomes, to propose in separate sections:

- **Rule candidate**: a convention to respect at all times, but only
  on a part of the repo → `.claude/rules/<topic>.md` with `paths:`. This
  is the default for anything of the form "in `src/api/`, always…".
  Costs context only if the area is touched. Without `paths:`, the rule
  is loaded at every session: reserve it for what truly applies
  everywhere.
- **Skill candidate**: a multi-step procedure triggered on demand
  (release, migration, generation) → capture the workflow, not the
  convention.
- **Refactor candidate**: the pattern reveals real debt/inconsistency
  → flag it as a problem to fix, NOT as a skill to create (creating a
  skill that documents a bad pattern freezes it instead of fixing it).

Quick test: "should I think about this every time I touch these
files?" → rule. "Do we run this from time to time?" → skill.

### When a rule candidate also calls for an ADR

If the detected convention rests on a non-obvious trade-off ("why this
format rather than another?"), propose the **pair**: the path-scoped
rule that says what to do, and an ADR that says why. The rule cites the
ADR without copying it.

Don't invent the "why": if the reason isn't deducible from the code or
git history, propose the rule alone and flag that the ADR needs an
answer from the user. An ADR on an invented motive is worse than no
ADR — it freezes a false justification.

## Scoring grid to rank candidates

For each candidate, estimate on 1-3:

| Criterion | 1 | 2 | 3 |
|---|---|---|---|
| Recurrence | seen twice | seen 3-5 times | seen 6+ times / everywhere |
| Non-obviousness | deducible by reading 1 file | deducible by reading several files | invisible without knowing the history/context |
| Cost of forgetting | minor (style) | easy but repeated fix | potential bug/incident |

Total score ≥ 7 → propose as priority. Score 4-6 → mention but as
second tier. Score < 4 → don't propose, too weak.

## Presentation format to the user

For each retained candidate:
1. Proposed name (gerund, e.g. `handling-payment-retries`)
2. Concrete proof: files/lines, number of occurrences
3. Score (see grid above)
4. Type: skill / subagent / refactor candidate (not a skill)
5. A one-sentence description in "what + when" format (ready to become
   the `description` field of the future SKILL.md)

NEVER create the SKILL.md file or the agent until the user has
explicitly validated the candidate.