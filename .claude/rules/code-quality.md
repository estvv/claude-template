---
paths:
  - "**/*.{js,jsx,ts,tsx,mjs,cjs,py,go,rs,rb,java,kt,php,cs,swift,sh}"
---

# Quality and tooling

Rule loaded only when a source file is read or written.
Restrict the extensions to the project's actual stack at bootstrap —
keeping a broad list costs context for nothing.

- Run the project's formatter/linter after a change, before
  concluding. The exact commands are in the "Commands" section of
  `CLAUDE.md`.
- Don't disable a lint rule inline (`eslint-disable`, `# noqa`,
  `#[allow(...)]`) without a comment saying why. Without justification,
  fix the code rather than silencing the tool.
- Don't reformat code unrelated to the task. A diff mixing reformatting
  and logic is unreadable in review.
- Follow the current file's style even if you'd do otherwise.
  Inconsistency costs more than "optimal" style.
- Don't leave dead code, unused imports, or debug `console.log` /
  `print` introduced by your own changes. Pre-existing dead code gets
  flagged, not removed by default.
- An error is only caught if you know what to do with it. No empty
  `catch` and no swallowed exception to "make it pass".