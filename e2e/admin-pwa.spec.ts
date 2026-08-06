import { expect, reseed, test, world } from "./fixtures";

test.beforeAll(reseed);

test.describe("admin panel", () => {
  test("creates, renames and protects a category", async ({ ownerPage }) => {
    await ownerPage.goto("/admin");

    await ownerPage.getByPlaceholder("Sport, Social, Créativité…").fill("Voyage");
    await ownerPage.getByRole("button", { name: "Ajouter", exact: true }).click();
    // Exact + lower-case matches the slug badge, not the "Voyage" <option>
    // the new category also adds to the template form's category select.
    await expect(ownerPage.getByText("voyage", { exact: true })).toBeVisible();

    // A category already used by an achievement cannot be deleted.
    const sportRow = ownerPage.locator("li", { hasText: "sport" }).first();
    await sportRow.hover();
    await expect(
      sportRow.getByRole("button", { name: /Supprimer Sport/ }),
    ).toBeDisabled();
  });

  test("rejects a duplicate category", async ({ ownerPage }) => {
    await ownerPage.goto("/admin");

    await ownerPage.getByPlaceholder("Sport, Social, Créativité…").fill("Sport");
    await ownerPage.getByRole("button", { name: "Ajouter", exact: true }).click();

    await expect(ownerPage.getByText(/existe déjà/)).toBeVisible();
  });

  test("creates an achievement template", async ({ ownerPage }) => {
    await ownerPage.goto("/admin");

    await ownerPage.getByLabel("Titre").fill("Courir un semi");
    await ownerPage
      .getByLabel("Description")
      .fill("21 km, capture obligatoire.");
    await ownerPage.getByLabel("Catégorie").click();
    await ownerPage.getByRole("option", { name: "Sport" }).click();
    await ownerPage.getByRole("button", { name: /Ajouter le modèle/ }).click();

    await expect(ownerPage.getByText("Courir un semi")).toBeVisible();
  });

  test("lists content from every group for moderation", async ({
    ownerPage,
  }) => {
    await ownerPage.goto("/admin/moderation");

    await expect(
      ownerPage.getByRole("heading", { name: "Modération" }),
    ).toBeVisible();
    await expect(
      ownerPage.getByText("Courir 10 km", { exact: true }),
    ).toBeVisible();
    await expect(
      ownerPage.getByText("Qui se lance ?", { exact: true }),
    ).toBeVisible();
  });

  test("removes a message from a group globally", async ({ ownerPage }) => {
    await ownerPage.goto("/admin/moderation");

    const row = ownerPage.locator("li", { hasText: "Qui se lance ?" }).first();
    await row.hover();
    await row.getByRole("button", { name: "Supprimer" }).click();

    await expect(ownerPage.getByText("Qui se lance ?")).toHaveCount(0);
  });
});

test.describe("PWA", () => {
  test("serves an installable manifest", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBe("Unlocked");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  test("serves the service worker", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("javascript");
  });

  test("declares the iOS home-screen meta tags", async ({ memberPage }) => {
    await memberPage.goto("/groups");

    await expect(
      memberPage.locator('link[rel="manifest"]'),
    ).toHaveAttribute("href", "/manifest.webmanifest");
    await expect(
      memberPage.locator('meta[name="apple-mobile-web-app-capable"]'),
    ).toHaveAttribute("content", "yes");
  });

  test("registers the service worker in the browser", async ({
    memberPage,
  }) => {
    await memberPage.goto("/groups");

    await expect
      .poll(async () =>
        memberPage.evaluate(async () => {
          const registration =
            await navigator.serviceWorker.getRegistration("/");
          return registration !== undefined;
        }),
      )
      .toBe(true);
  });

  test("never caches authenticated pages or uploads", async ({
    memberPage,
  }) => {
    await memberPage.goto("/groups");
    // Without waiting for the worker to take control, the navigations below
    // bypass it entirely and the assertion would pass vacuously.
    await memberPage.evaluate(() => navigator.serviceWorker.ready);
    await memberPage.reload();

    await memberPage.goto(`/g/${world.groupId}`);
    await memberPage.goto(`/g/${world.groupId}/achievements/${world.raceId}`);

    const cached: string[] = await memberPage.evaluate(async () => {
      const names = await caches.keys();
      const urls: string[] = [];
      for (const name of names) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          urls.push(new URL(request.url).pathname);
        }
      }
      return urls;
    });

    // Only immutable build output and icons may be stored.
    for (const path of cached) {
      expect(
        path.startsWith("/_next/static/") ||
          path.startsWith("/icons/") ||
          path === "/offline.html",
        `unexpected cached entry: ${path}`,
      ).toBe(true);
    }

    expect(cached.some((p) => p.startsWith("/api/"))).toBe(false);
    expect(cached.some((p) => p.startsWith("/g/"))).toBe(false);
    expect(cached).not.toContain("/groups");
  });

  test("keeps a single versioned cache", async ({ memberPage }) => {
    await memberPage.goto("/groups");

    await expect
      .poll(async () => memberPage.evaluate(() => caches.keys()), {
        timeout: 10_000,
      })
      .toEqual(["unlocked-v2"]);
  });
});

test.describe("upload endpoint", () => {
  test("refuses an unauthenticated read", async ({ request }) => {
    const response = await request.get(
      "/api/uploads/00000000-0000-0000-0000-000000000000.png",
      { maxRedirects: 0 },
    );
    // Redirected to the login page rather than serving anything.
    expect([302, 307]).toContain(response.status());
  });
});

test.describe("mobile layout", () => {
  // `isMobile` comes from the device preset, so this block only runs on the
  // phone project.
  test.skip(({ isMobile }) => !isMobile, "phone-only layout");

  test("shows the bottom tab bar inside a group", async ({ memberPage }) => {
    await memberPage.goto(`/g/${world.groupId}`);

    const nav = memberPage.getByLabel("Navigation principale");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Achievements" })).toBeVisible();
  });

  test("hides the desktop sidebar", async ({ memberPage }) => {
    await memberPage.goto(`/g/${world.groupId}`);
    await expect(memberPage.locator("aside")).toBeHidden();
  });

  test("exposes the account menu in the mobile header", async ({
    memberPage,
  }) => {
    await memberPage.goto(`/g/${world.groupId}`);

    await memberPage.getByLabel("Menu du compte").click();
    await expect(
      memberPage.getByRole("menuitem", { name: "Mes groupes" }),
    ).toBeVisible();
  });
});
