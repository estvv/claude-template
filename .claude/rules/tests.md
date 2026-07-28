---
paths:
  - "**/*.{test,spec}.{js,jsx,ts,tsx,mjs,cjs}"
  - "**/test_*.py"
  - "**/*_test.{py,go,rb}"
  - "**/{test,tests,spec,__tests__}/**"
---

# Tests

Rule loaded only when a test file is read or written.
The globs above are intentionally broad — restrict them to the project's
actual layout at bootstrap time.

- Never modify production code to make a test pass. If the test fails,
  either the test is wrong or the code has a bug: decide explicitly,
  don't work around it.
- A test that passes no matter what is worse than no test: empty
  assertion, mock that fakes the tested behavior, `try/catch` that
  swallows the failure.
- Look for existing fixtures/helpers before creating new ones. A
  duplicated fixture will drift from the original sooner or later.
- Pin time and randomness (dates, UUIDs, seeds) — otherwise the test
  becomes flaky and someone disables it in six months.
- A regression test must first fail against the buggy code. Write the
  test, see it red, then fix.
- Run the tests before concluding. Never announce they pass without
  having run them; if they fail, say so with the output.