# Git

Rule loaded at every session (no `paths`): it applies regardless of
which file is touched.

- Never commit or push without an explicit request. Finishing a task
  ≠ committing it.
- Never commit directly on the default branch: create a branch first.
- No `push --force` and no rewriting of already-pushed history (`rebase`,
  `commit --amend`) without explicit validation.
- Don't add files unrelated to the task to the commit. Check `git status`
  before `git add`; don't blindly run `git add -A`.
- A commit message says **why**, not **what** — the diff already says
  what.
- Never commit a secret, `.env`, database dump, or credential. If unsure
  about a file, ask.