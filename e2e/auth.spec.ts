import { expect, reseed, test, world } from "./fixtures";

test.beforeAll(reseed);

test.describe("authentication", () => {
  test("sends a guest from the root to the login page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("button", { name: /Discord/i }),
    ).toBeVisible();
  });

  for (const path of [
    "/groups",
    "/groups/new",
    "/leaderboard",
    "/admin",
    "/admin/moderation",
  ]) {
    test(`redirects a guest away from ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test("keeps a signed-in member out of the login page", async ({
    memberPage,
  }) => {
    await memberPage.goto("/login");
    await expect(memberPage).toHaveURL(/\/groups$/);
  });

  test("lands a signed-in member on their groups", async ({ memberPage }) => {
    await memberPage.goto("/");
    await expect(memberPage).toHaveURL(/\/groups$/);
    await expect(
      memberPage.locator("main").getByRole("link", { name: /Les Potos/ }),
    ).toBeVisible();
  });
});

test.describe("group access control", () => {
  test("hides a group from someone who was never invited", async ({
    outsiderPage,
  }) => {
    const response = await outsiderPage.goto(`/g/${world.groupId}`);
    expect(response?.status()).toBe(404);
  });

  test("hides a group's achievements from an outsider", async ({
    outsiderPage,
  }) => {
    const response = await outsiderPage.goto(
      `/g/${world.groupId}/achievements/${world.raceId}`,
    );
    expect(response?.status()).toBe(404);
  });

  test("keeps a plain member out of the owner's settings", async ({
    memberPage,
  }) => {
    const response = await memberPage.goto(`/g/${world.groupId}/settings`);
    expect(response?.status()).toBe(404);
  });

  test("keeps a non-admin out of the admin area", async ({ memberPage }) => {
    expect((await memberPage.goto("/admin"))?.status()).toBe(404);
    expect((await memberPage.goto("/admin/moderation"))?.status()).toBe(404);
  });

  test("lets the platform admin in", async ({ ownerPage }) => {
    await ownerPage.goto("/admin");
    await expect(
      ownerPage.getByRole("heading", { name: "Administration" }),
    ).toBeVisible();
  });
});
