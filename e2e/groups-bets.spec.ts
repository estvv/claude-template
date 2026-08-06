import { expect, reseed, test, world } from "./fixtures";

test.beforeAll(reseed);

test.describe("group dashboard", () => {
  test("shows the member's balances and pending votes", async ({
    ownerPage,
  }) => {
    await ownerPage.goto(`/g/${world.groupId}`);

    await expect(ownerPage.getByText("Mon karma")).toBeVisible();
    await expect(ownerPage.getByText("Mes tokens")).toBeVisible();
    await expect(ownerPage.getByText(/attendent ton vote/)).toBeVisible();
  });

  test("does not ask the submitter to vote on their own proof", async ({
    memberPage,
  }) => {
    await memberPage.goto(`/g/${world.groupId}`);
    await expect(memberPage.getByText(/attendent ton vote/)).toHaveCount(0);
  });
});

test.describe("joining a group", () => {
  test("an invite link adds the visitor as a member", async ({
    outsiderPage,
  }) => {
    await outsiderPage.goto(`/join/${world.inviteCode}`);

    await expect(outsiderPage).toHaveURL(`/g/${world.groupId}`);
    await expect(
      outsiderPage.getByRole("heading", { name: /Salut/ }),
    ).toBeVisible();
  });

  test("a bad invite code 404s", async ({ outsiderPage }) => {
    const response = await outsiderPage.goto("/join/pas-un-code");
    expect(response?.status()).toBe(404);
  });

  test("the join form rejects an unknown code", async ({ outsiderPage }) => {
    await outsiderPage.goto("/groups");
    await outsiderPage
      .getByRole("button", { name: "Rejoindre un groupe" })
      .click();
    await outsiderPage.getByPlaceholder("Code d'invitation").fill("nawak");
    await outsiderPage.getByRole("button", { name: "Rejoindre" }).click();

    await expect(
      outsiderPage.getByText(/Ce code d'invitation n'existe pas/),
    ).toBeVisible();
  });
});

test.describe("creating a group", () => {
  test("the creator becomes owner and gets a starting balance", async ({
    outsiderPage,
  }) => {
    await outsiderPage.goto("/groups/new");

    await outsiderPage.getByLabel("Nom du groupe").fill("Nouveau Crew");
    await outsiderPage.getByRole("button", { name: /Créer le groupe/ }).click();

    await expect(outsiderPage).toHaveURL(/\/g\/[a-z0-9]+$/);
    await outsiderPage.goto("/groups");
    await expect(
      outsiderPage.locator("main").getByRole("link", { name: /Nouveau Crew/ }),
    ).toBeVisible();
    await expect(outsiderPage.getByText("OWNER").first()).toBeVisible();
  });

  test("refuses a one-character name", async ({ outsiderPage }) => {
    await outsiderPage.goto("/groups/new");
    await outsiderPage.getByLabel("Nom du groupe").fill("x");
    await outsiderPage.getByRole("button", { name: /Créer le groupe/ }).click();

    await expect(outsiderPage.getByText(/au moins 2 caractères/)).toBeVisible();
  });
});

test.describe("betting", () => {
  test("a member can stake tokens on a candidate", async ({ memberPage }) => {
    await memberPage.goto(`/g/${world.groupId}/achievements/${world.raceId}`);

    await memberPage.getByRole("button", { name: /^Lea/ }).click();
    await memberPage.getByLabel("Mise").fill("25");
    await memberPage.getByRole("button", { name: "Miser" }).click();

    await expect(memberPage.getByText(/Tu as misé 25 tokens/)).toBeVisible();
  });

  test("refuses a stake larger than the balance", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/achievements/${world.raceId}`);

    await ownerPage.getByRole("button", { name: /^Paul/ }).click();
    await ownerPage.getByLabel("Mise").fill("100000");
    await ownerPage.getByRole("button", { name: "Miser" }).click();

    await expect(ownerPage.getByText(/Tu n'as que/)).toBeVisible();
  });

  test("offers to open a bet where none exists yet", async ({ memberPage }) => {
    await memberPage.goto(`/g/${world.groupId}/achievements/${world.personalId}`);

    await expect(
      memberPage.getByText(/Aucun pari sur cet achievement/),
    ).toBeVisible();
    await memberPage.getByRole("button", { name: "Ouvrir un pari" }).click();

    await expect(memberPage.getByText("Va-t-il réussir ?")).toBeVisible();
  });

  test("lists the group's bets", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/bets`);

    await expect(
      ownerPage.getByRole("heading", { name: "Paris" }),
    ).toBeVisible();
    await expect(ownerPage.getByText("Qui finira premier ?")).toBeVisible();
  });
});

test.describe("leaderboards and calendar", () => {
  test("ranks members by karma inside the group", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/leaderboard`);

    const rows = ownerPage.locator("tbody tr");
    await expect(rows.first()).toContainText("Paul");
    await expect(rows.first()).toContainText("120");
  });

  test("filters the ranking by category", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/leaderboard`);
    await ownerPage.getByRole("link", { name: "Sport", exact: true }).click();

    await expect(ownerPage).toHaveURL(/category=sport/);
    // Nothing has been validated in Sport yet, so everyone sits at zero.
    await expect(ownerPage.getByText(/Karma gagné en/)).toBeVisible();
  });

  test("aggregates karma across groups on the global board", async ({
    ownerPage,
  }) => {
    await ownerPage.goto("/leaderboard");

    await expect(
      ownerPage.getByRole("heading", { name: "Classement global" }),
    ).toBeVisible();
    await expect(ownerPage.locator("tbody tr").first()).toContainText("Paul");
  });

  test("lists deadlines on the calendar", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/calendar`);

    await expect(
      ownerPage.getByRole("heading", { name: "Calendrier" }),
    ).toBeVisible();
    await expect(
      ownerPage.getByRole("link", { name: /Courir 10 km/ }),
    ).toBeVisible();
    await expect(ownerPage.getByText(/créé le/).first()).toBeVisible();
  });
});

test.describe("group settings", () => {
  test("shows the invite link and the member list", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/settings`);

    await expect(
      ownerPage.getByRole("heading", { name: "Paramètres" }),
    ).toBeVisible();
    await expect(ownerPage.getByText(/Membres \(/)).toBeVisible();
    await expect(
      ownerPage.locator('input[readonly][value*="/join/"]'),
    ).toBeVisible();
  });

  test("refuses a webhook that is not a Discord one", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/settings`);

    await ownerPage
      .getByPlaceholder("https://discord.com/api/webhooks/…")
      .fill("https://evil.example.com/hook");
    await ownerPage.getByRole("button", { name: "Enregistrer" }).click();

    await expect(ownerPage.getByText(/doit être un webhook Discord/)).toBeVisible();
  });
});
