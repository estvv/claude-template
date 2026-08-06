---
paths:
  - "Dockerfile"
  - ".dockerignore"
  - "compose.yaml"
  - "Caddyfile"
  - "docker/**"
  - ".github/workflows/**"
---

# Deployment

The image is a `next build --output standalone` runtime. Tracing keeps the
`node_modules` small, which is the whole point — but it also means **anything
outside the app's import graph is absent from the image**. Two consequences:

- Adding a package that only a script imports (`prisma/seed.ts`,
  `scripts/*.mjs`) requires an explicit `COPY --from=deps` in the runner
  stage. Next inlines the driver adapter into the server bundle, so even
  `@prisma/adapter-better-sqlite3` had to be copied back for the seed.
- better-sqlite3 loads its addon through `bindings`, which builds the path at
  runtime. `outputFileTracingIncludes` in `next.config.ts` pins the `.node`
  binary; dropping it produces an image that builds and then fails on the
  first query.

The Prisma CLI lives in its own `/tools` tree, not in `node_modules`: it drags
`effect` and Prisma Studio behind it (~240 MB) and would cancel out tracing.
The entrypoint runs it with `/tools` as the working directory, which is why
`prisma/` and `prisma.config.ts` are copied there too. The tools stage runs a
real `migrate deploy` during the build so a missing transitive dependency
fails CI instead of the VPS boot.

`docker/entrypoint.sh` is the deployment: snapshot, migrate, seed, serve. A
step that must run on every release belongs there, not in a CD step over SSH —
`docker compose up` on the VPS has to be enough to converge.

CD is chained on CI through `workflow_run`, so it deploys the commit CI
validated (`github.event.workflow_run.head_sha`), never the branch head.
