import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOAD_DIR } from "@/lib/uploads";
import { requireUser } from "@/lib/session";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".weba": "audio/webm",
  ".wav": "audio/wav",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  await requireUser();

  const { name } = await params;

  // Names are generated as `<uuid><ext>`; anything else is a traversal attempt.
  if (!/^[a-f0-9-]{36}\.[a-z0-9]{3,4}$/i.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentType = CONTENT_TYPES[path.extname(name).toLowerCase()];
  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await readFile(path.join(UPLOAD_DIR, name));
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        // Content is immutable (uuid filenames) but private to members.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
