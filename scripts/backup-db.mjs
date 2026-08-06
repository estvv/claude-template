/**
 * Snapshots the SQLite database before a migration.
 *
 * Prisma physically recreates tables for some SQLite schema changes, so a
 * failed `migrate deploy` can lose data with no way back. This runs first and
 * refuses to continue if it cannot produce a snapshot.
 *
 * Uses SQLite's own backup API rather than copying the file: a plain `cp` of a
 * database being written to can capture a torn page.
 */
import "dotenv/config";
import { mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const KEEP = 10;

function databasePath() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL n'est pas défini.");
  if (!url.startsWith("file:")) {
    throw new Error(`DATABASE_URL n'est pas un fichier SQLite : ${url}`);
  }
  // Both the driver adapter and the CLI resolve a relative `file:` URL against
  // the working directory here, which is why dev.db sits at the repo root.
  const raw = url.slice("file:".length);
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

const source = databasePath();
statSync(source); // throws a clear ENOENT if the database isn't there yet

const dir = process.env.BACKUP_DIR ?? path.join(process.cwd(), "backups");
mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(dir, `${path.basename(source)}.${stamp}.bak`);

const db = new Database(source, { readonly: true });
await db.backup(target);
db.close();

// Keep the last few snapshots so a VPS disk doesn't fill up silently.
const stale = readdirSync(dir)
  .filter((name) => name.endsWith(".bak"))
  .sort()
  .slice(0, -KEEP);
for (const name of stale) unlinkSync(path.join(dir, name));

console.log(`save : ${path.relative(process.cwd(), target)}`);
