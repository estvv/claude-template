/**
 * Upload MIME whitelist, kept in its own module so client components can read
 * it for `<input accept>` without pulling `node:fs` into the browser bundle.
 *
 * Covers the four proof kinds from docs/IDEAS.md: photo, video, voice, screen.
 */
export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/ogg": ".ogg",
  "audio/webm": ".weba",
  "audio/wav": ".wav",
};

export const ACCEPTED_UPLOAD_TYPES = Object.keys(ALLOWED_UPLOAD_TYPES).join(",");

const AUDIO_EXTENSIONS = /\.(mp3|m4a|ogg|weba|wav)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm)$/i;

export type MediaKind = "audio" | "video" | "image";

/** Which player a stored proof/attachment needs, based on its URL. */
export function mediaKind(url: string): MediaKind {
  if (AUDIO_EXTENSIONS.test(url)) return "audio";
  if (VIDEO_EXTENSIONS.test(url)) return "video";
  return "image";
}
