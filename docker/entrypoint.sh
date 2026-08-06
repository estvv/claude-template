#!/bin/sh
# Container form of `npm run db:deploy` followed by `npm run db:seed`, then the
# server. The database lives on a volume, so this has to run at boot rather
# than at build time.
set -e

# Snapshot before migrating: Prisma physically recreates tables for some SQLite
# schema changes, and a failed `migrate deploy` would otherwise be unrecoverable.
db_file=${DATABASE_URL#file:}
if [ -f "$db_file" ]; then
  node scripts/backup-db.mjs
fi

(cd /tools && node node_modules/prisma/build/index.js migrate deploy)

# Idempotent: reference categories and, if BOOTSTRAP_ADMIN_EMAIL is set, the
# platform admin.
node /tools/node_modules/tsx/dist/cli.mjs prisma/seed.ts

exec node server.js
