import { describe, expect, it } from "vitest";
import {
  ACCEPTED_UPLOAD_TYPES,
  ALLOWED_UPLOAD_TYPES,
  mediaKind,
} from "@/lib/upload-types";

describe("mediaKind", () => {
  it("detects audio proofs (the 'voice' kind from docs/IDEAS.md)", () => {
    for (const url of ["/api/uploads/a.mp3", "/x.m4a", "/x.ogg", "/x.weba", "/x.wav"]) {
      expect(mediaKind(url)).toBe("audio");
    }
  });

  it("detects video proofs", () => {
    for (const url of ["/x.mp4", "/x.mov", "/x.webm"]) {
      expect(mediaKind(url)).toBe("video");
    }
  });

  it("treats anything else as an image", () => {
    for (const url of ["/x.jpg", "/x.png", "/x.webp", "/x.gif"]) {
      expect(mediaKind(url)).toBe("image");
    }
  });

  it("is case-insensitive on the extension", () => {
    expect(mediaKind("/PROOF.MP4")).toBe("video");
    expect(mediaKind("/PROOF.MP3")).toBe("audio");
  });

  it("does not mistake an extension appearing mid-path for the real one", () => {
    expect(mediaKind("/uploads/mp3-notes/photo.png")).toBe("image");
  });
});

describe("upload whitelist", () => {
  it("covers photo, video, voice and screenshot proofs", () => {
    const types = Object.keys(ALLOWED_UPLOAD_TYPES);
    expect(types.some((t) => t.startsWith("image/"))).toBe(true);
    expect(types.some((t) => t.startsWith("video/"))).toBe(true);
    expect(types.some((t) => t.startsWith("audio/"))).toBe(true);
  });

  it("maps every accepted MIME type to a distinct-looking extension", () => {
    for (const [mime, extension] of Object.entries(ALLOWED_UPLOAD_TYPES)) {
      expect(extension.startsWith("."), `${mime} -> ${extension}`).toBe(true);
    }
  });

  it("exposes the whitelist as an accept attribute", () => {
    expect(ACCEPTED_UPLOAD_TYPES.split(",")).toEqual(
      Object.keys(ALLOWED_UPLOAD_TYPES),
    );
  });

  it("rejects executables and documents", () => {
    expect(ALLOWED_UPLOAD_TYPES["application/x-sh"]).toBeUndefined();
    expect(ALLOWED_UPLOAD_TYPES["application/pdf"]).toBeUndefined();
    expect(ALLOWED_UPLOAD_TYPES["text/html"]).toBeUndefined();
  });
});
