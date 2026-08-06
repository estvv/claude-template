import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { ALLOWED_UPLOAD_TYPES } from "@/lib/upload-types";

/**
 * Uploads live outside `public/` so they survive rebuilds and stay independent
 * of the static asset pipeline; they are served back through
 * `/api/uploads/[name]`. On the VPS, point UPLOAD_DIR at a mounted volume.
 *
 * Relative by default — Node resolves it against the working directory at
 * runtime. Deriving it from `process.cwd()` at module scope instead makes
 * Turbopack trace the entire project into the build output.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads";

const MAX_BYTES = 10 * 1024 * 1024;

export class UploadError extends Error {}

/** Persists an uploaded proof/illustration and returns its public URL. */
export async function saveUpload(file: File): Promise<string> {
  const extension = ALLOWED_UPLOAD_TYPES[file.type];
  if (!extension) {
    throw new UploadError("Format non supporté (images et vidéos uniquement).");
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError("Fichier trop lourd (10 Mo maximum).");
  }

  const name = `${randomUUID()}${extension}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(
    path.join(UPLOAD_DIR, name),
    Buffer.from(await file.arrayBuffer()),
  );

  return `/api/uploads/${name}`;
}
