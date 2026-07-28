---
name: good-practices
description: >
  Behavioral guardrails to reduce the classic mistakes of LLMs that
  code: over-engineering, collateral changes, unstated assumptions,
  fuzzy success criteria. Use this skill when you write, review, or
  refactor non-trivial code, and in particular before starting on a
  task whose scope isn't yet clear.
license: MIT
---

# Good practices

Guardrails against the recurring mistakes of LLMs that code.

**Acknowledged trade-off:** these rules favor caution over speed. For a
trivial task, use your judgment.

## 1. Think before coding

**Don't assume. Don't hide confusion. Expose trade-offs.**

Before implementing:

- State your assumptions explicitly. When in doubt, ask.
- If several interpretations exist, present them — don't silently pick
  one.
- If a simpler approach exists, say so. Object when justified.
- If something is unclear, stop. Name what blocks you. Ask.

## 2. Simplicity first

**The minimum code that solves the problem. Nothing speculative.**

- No feature beyond what was asked.
- No abstraction for code used only once.
- No unrequested "flexibility" or "configurability".
- No error handling for impossible scenarios.
- If you write 200 lines and 50 would suffice, rewrite.

The test: "would a senior engineer say this is over-complicated?" If
yes, simplify.

## 3. Surgical changes

**Touch only what's necessary. Clean up only your own mess.**

When modifying existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor what isn't broken.
- Follow the existing style, even if you'd do otherwise.
- If you spot unrelated dead code, flag it — don't remove it.

When your changes create orphans:

- Remove the imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code without being asked.

The test: every modified line must tie directly to the request.

## 4. Goal-driven execution

**Define success criteria. Loop until verified.**

Turn tasks into verifiable objectives:

- "Add validation" → "Write tests for invalid inputs, then make them
  pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Verify tests pass before and after"

For a multi-step task, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop autonomously. Weak criteria ("just
make it work") force constant back-and-forth.