import { describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { GET } from "@/app/api/uploads/[name]/route";
import { saveUpload, UploadError, UPLOAD_DIR } from "@/lib/uploads";
import { actAs, actAsGuest, makeUser } from "../db";
import { RedirectError } from "../mocks";

const params = (name: string) => ({ params: Promise.resolve({ name }) });
const request = () => new Request("http://localhost/api/uploads/x");

async function seedFile(name: string, body = "data") {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), body);
}

describe("saveUpload", () => {
  it("stores an image under a random name and returns its URL", async () => {
    const url = await saveUpload(
      new File(["x"], "photo.png", { type: "image/png" }),
    );
    expect(url).toMatch(/^\/api\/uploads\/[a-f0-9-]{36}\.png$/);
  });

  it("keeps the extension matching the declared type, not the filename", async () => {
    const url = await saveUpload(
      new File(["x"], "sneaky.php", { type: "image/jpeg" }),
    );
    expect(url.endsWith(".jpg")).toBe(true);
  });

  it("accepts an audio proof", async () => {
    const url = await saveUpload(
      new File(["x"], "voice.mp3", { type: "audio/mpeg" }),
    );
    expect(url.endsWith(".mp3")).toBe(true);
  });

  it.each(["application/x-sh", "application/pdf", "text/html", ""])(
    "refuses the type %j",
    async (type) => {
      await expect(
        saveUpload(new File(["x"], "f", { type })),
      ).rejects.toThrow(UploadError);
    },
  );

  it("refuses a file over the size limit", async () => {
    const oversized = new File(
      [new Uint8Array(11 * 1024 * 1024)],
      "big.png",
      { type: "image/png" },
    );
    await expect(saveUpload(oversized)).rejects.toThrow(UploadError);
  });

  it("never reuses a name across uploads", async () => {
    const file = () => new File(["x"], "a.png", { type: "image/png" });
    const first = await saveUpload(file());
    const second = await saveUpload(file());
    expect(first).not.toBe(second);
  });
});

describe("GET /api/uploads/[name]", () => {
  it("serves a stored file to a signed-in member", async () => {
    actAs(await makeUser());
    const name = `${randomUUID()}.png`;
    await seedFile(name);

    const response = await GET(request(), params(name));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("marks proofs private in the cache header", async () => {
    actAs(await makeUser());
    const name = `${randomUUID()}.jpg`;
    await seedFile(name);

    const response = await GET(request(), params(name));

    expect(response.headers.get("Cache-Control")).toContain("private");
  });

  it("sends a guest to the login page instead of the file", async () => {
    actAsGuest();
    const name = `${randomUUID()}.png`;
    await seedFile(name);

    await expect(GET(request(), params(name))).rejects.toThrow(RedirectError);
  });

  it.each([
    "../../../etc/passwd",
    "..%2f..%2fetc%2fpasswd",
    "/etc/passwd",
    "....//....//etc/passwd",
    "proof.png",
    "abc.png",
    `${randomUUID()}.sh`,
    `${randomUUID()}`,
  ])("rejects the malformed name %j", async (name) => {
    actAs(await makeUser());

    const response = await GET(request(), params(name));

    expect(response.status).toBe(404);
  });

  it("404s on a well-formed name that does not exist", async () => {
    actAs(await makeUser());

    const response = await GET(request(), params(`${randomUUID()}.png`));

    expect(response.status).toBe(404);
  });

  it.each([
    [".mp4", "video/mp4"],
    [".mp3", "audio/mpeg"],
    [".webp", "image/webp"],
    [".wav", "audio/wav"],
  ])("serves %s as %s", async (extension, contentType) => {
    actAs(await makeUser());
    const name = `${randomUUID()}${extension}`;
    await seedFile(name);

    const response = await GET(request(), params(name));

    expect(response.headers.get("Content-Type")).toBe(contentType);
  });
});
