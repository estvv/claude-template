# Good practices

Rule loaded at every session (no `paths`): these are coding reflexes,
they apply before any file is opened. They favor caution over speed —
on a trivial task, use your judgment.

## Simplicity

- No feature beyond what was asked, no abstraction for code used once,
  no unrequested flexibility, no error handling for impossible cases.
- If a simpler approach than the one requested exists, say so before
  implementing. Object when justified.
- The test: would a senior engineer say this is over-complicated?

## Surgical changes

- Don't "improve" adjacent code, comments, or formatting; don't
  refactor what isn't broken. Follow the existing style, even if you'd
  do otherwise.
- Remove the imports/variables/functions that YOUR change orphaned —
  nothing else. Pre-existing dead code gets flagged, not deleted.
- The test: every modified line ties directly to the request.

## Verifiable objectives

- Turn the task into a criterion checkable before starting: "fix the
  bug" → "write a test that reproduces it, then make it pass";
  "refactor X" → "tests pass before and after".
- For a multi-step task, state the plan as `step → verification` before
  writing code. Weak criteria ("make it work") force constant
  back-and-forth; strong ones let you loop on your own.
