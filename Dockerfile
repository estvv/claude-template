# syntax=docker/dockerfile:1

# Debian rather than Alpine: better-sqlite3 only publishes glibc prebuilds, so
# a musl base would recompile the addon from source in every rebuild.
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma's schema engine probes for libssl and falls back to a wrong default
# without it, warning on every migration.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# deps — full install: compiles/downloads better-sqlite3 and runs the
# `postinstall` (`prisma generate`). Kept as its own stage so the build
# toolchain never reaches the runtime image, and so a source-only change
# doesn't reinstall.
# ---------------------------------------------------------------------------
FROM base AS deps
# Fallback for architectures where prebuild-install finds no binary.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
# `prisma.config.ts` resolves the datasource URL at load time; nothing ever
# opens this file during the build, it only has to parse.
ENV DATABASE_URL=file:/tmp/build.db
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# ---------------------------------------------------------------------------
# tools — the Prisma CLI and tsx, which the entrypoint needs to migrate and
# seed at boot. They live in their own tree: the CLI pulls `effect` and Studio
# behind it, and merging that into the traced `node_modules` of the standalone
# build would undo what tracing bought us. Versions come from the lockfile, so
# the container migrates with the exact CLI the repository was tested against.
# ---------------------------------------------------------------------------
FROM base AS tools
WORKDIR /tools
COPY package-lock.json ./
RUN node -e "const lock = require('./package-lock.json'); \
      const version = (name) => lock.packages['node_modules/' + name].version; \
      console.log(['prisma', 'tsx', 'dotenv'].map((n) => n + '@' + version(n)).join(' '))" > specs \
    && npm init -y > /dev/null \
    && npm install --no-audit --no-fund $(cat specs) \
    && rm specs package-lock.json
COPY prisma ./prisma
COPY prisma.config.ts ./
# A tooling tree missing one of the CLI's transitive dependencies has to fail
# the build here, not the first boot on the VPS.
RUN DATABASE_URL=file:/tmp/smoke.db node node_modules/prisma/build/index.js migrate deploy \
    && rm -f /tmp/smoke.db

# ---------------------------------------------------------------------------
# builder — `next build` with `output: "standalone"`.
# ---------------------------------------------------------------------------
FROM base AS builder
ENV DATABASE_URL=file:/tmp/build.db
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# runner
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/unlocked.db \
    UPLOAD_DIR=/data/uploads \
    BACKUP_DIR=/data/backups

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Migration and seed tooling, self-contained: the entrypoint runs the CLI with
# /tools as its working directory.
COPY --from=tools /tools /tools

# `seed.ts` and `backup-db.mjs` run against the app's own tree instead, where
# the generated client and better-sqlite3 already are. What follows is what
# tracing had no reason to keep: nothing in the app imports `dotenv`, and the
# driver adapter was inlined into the server bundle rather than left as a
# package, so `seed.ts` can no longer resolve it by name.
COPY --from=deps /app/src/generated ./src/generated
COPY --from=deps /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=deps /app/node_modules/@prisma/adapter-better-sqlite3 ./node_modules/@prisma/adapter-better-sqlite3
COPY --from=deps /app/node_modules/@prisma/driver-adapter-utils ./node_modules/@prisma/driver-adapter-utils
COPY --from=deps /app/node_modules/@prisma/debug ./node_modules/@prisma/debug
COPY prisma/seed.ts ./prisma/seed.ts
# Dev-only in practice (fixtures.ts refuses to run under NODE_ENV=production),
# but cheap enough to always include rather than branching the build.
COPY prisma/fixtures.ts ./prisma/fixtures.ts
COPY src/lib/constants.ts ./src/lib/constants.ts
COPY src/lib/password.ts ./src/lib/password.ts
COPY scripts ./scripts
COPY docker/entrypoint.sh /usr/local/bin/entrypoint

# Everything under /app stays root-owned and read-only to the app user; the
# only writable paths are the data volume and Next's incremental cache.
RUN mkdir -p /data/uploads /data/backups /app/.next/cache \
    && chown -R node:node /data /app/.next/cache

USER node
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint"]
