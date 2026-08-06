import { expect, reseed, test, world } from "./fixtures";

test.beforeAll(reseed);

test.describe("achievement list", () => {
  test("shows the group's live achievements", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/achievements`);
    await expect(
      ownerPage.getByRole("link", { name: /Courir 10 km/ }),
    ).toBeVisible();
    await expect(
      ownerPage.getByRole("link", { name: /Monter 100 etages/ }),
    ).toBeVisible();
  });

  test("filters down to finished achievements", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/achievements?filter=done`);
    await expect(ownerPage.getByText(/Aucun achievement ici/)).toBeVisible();
  });
});

test.describe("achievement detail", () => {
  test("shows the competition, its bet and its thread", async ({
    ownerPage,
  }) => {
    await ownerPage.goto(`/g/${world.groupId}/achievements/${world.raceId}`);

    await expect(
      ownerPage.getByRole("heading", { name: "Courir 10 km" }),
    ).toBeVisible();
    await expect(ownerPage.getByText("Qui finira premier ?")).toBeVisible();
    await expect(ownerPage.getByText("Discussion")).toBeVisible();
    await expect(ownerPage.getByText("Qui se lance ?")).toBeVisible();
  });

  test("offers the estimation vote while the window is open", async ({
    ownerPage,
  }) => {
    await ownerPage.goto(
      `/g/${world.groupId}/achievements/${world.estimatingId}`,
    );
    await expect(ownerPage.getByText("Combien ça vaut ?")).toBeVisible();
  });

  test("offers the submission form to the targeted member only", async ({
    ownerPage,
  }) => {
    // Paul is the target of the personal challenge.
    await ownerPage.goto(`/g/${world.groupId}/achievements/${world.personalId}`);
    await expect(ownerPage.getByText("Je l'ai fait")).toBeVisible();
  });

  test("hides the submission form from everyone else", async ({
    memberPage,
  }) => {
    await memberPage.goto(`/g/${world.groupId}/achievements/${world.personalId}`);
    await expect(memberPage.getByText("Je l'ai fait")).toHaveCount(0);
  });

  test("does not let the submitter vote on their own proof", async ({
    memberPage,
  }) => {
    await memberPage.goto(`/g/${world.groupId}/achievements/${world.raceId}`);
    await expect(
      memberPage.getByText(/Tu ne peux pas voter sur ta propre preuve/),
    ).toBeVisible();
    await expect(
      memberPage.getByRole("button", { name: "Valider" }),
    ).toHaveCount(0);
  });
});

test.describe("validation vote", () => {
  test("a member can approve someone else's proof", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/achievements/${world.raceId}`);

    await ownerPage.getByRole("button", { name: "Valider" }).first().click();
    await expect(ownerPage.getByText(/Ton vote/)).toBeVisible();
  });

  test("the zero-point button really votes zero", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/achievements/${world.raceId}`);

    // The karma input still holds its default; "0 point" must ignore it.
    await ownerPage.getByRole("button", { name: "0 point" }).click();
    await expect(ownerPage.getByText(/Ton vote : 0 karma/)).toBeVisible();
  });

  test("a member can contest a proof", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/achievements/${world.raceId}`);

    await ownerPage.getByRole("button", { name: "Rejeter" }).click();
    await expect(ownerPage.getByText(/Ton vote : rejet/)).toBeVisible();
  });
});

test.describe("creating an achievement", () => {
  test("the owner sets the karma value directly", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/achievements/new`);

    await expect(ownerPage.getByLabel("Valeur (karma)")).toBeVisible();

    await ownerPage.getByLabel("Titre").fill("Faire 50 pompes");
    await ownerPage.getByLabel("Description").fill("D'affilée.");
    await ownerPage.getByLabel("Catégorie").click();
    await ownerPage.getByRole("option", { name: "Sport" }).click();
    await ownerPage.getByLabel("Valeur (karma)").fill("40");
    await ownerPage.getByRole("button", { name: /Créer l'achievement/ }).click();

    await expect(ownerPage).toHaveURL(
      new RegExp(`/g/${world.groupId}/achievements/[a-z0-9]+$`),
    );
    await expect(
      ownerPage.getByRole("heading", { name: "Faire 50 pompes" }),
    ).toBeVisible();
    await expect(ownerPage.getByText("40 karma")).toBeVisible();
  });

  test("a plain member gets an estimation vote instead of a karma field", async ({
    memberPage,
  }) => {
    await memberPage.goto(`/g/${world.groupId}/achievements/new`);

    await expect(memberPage.getByLabel("Valeur (karma)")).toHaveCount(0);
    await expect(
      memberPage.getByText(/Le groupe a 48 h pour estimer/),
    ).toBeVisible();

    await memberPage.getByLabel("Titre").fill("Dormir 10 heures");
    await memberPage.getByLabel("Catégorie").click();
    await memberPage.getByRole("option", { name: "Social" }).click();
    await memberPage.getByRole("button", { name: /Créer l'achievement/ }).click();

    await expect(memberPage.getByText("Combien ça vaut ?")).toBeVisible();
  });

  test("asks for a target when the challenge is personal", async ({
    ownerPage,
  }) => {
    await ownerPage.goto(`/g/${world.groupId}/achievements/new`);

    await expect(ownerPage.getByLabel("Personne visée")).toHaveCount(0);
    await ownerPage.getByLabel("Type").click();
    await ownerPage.getByRole("option", { name: /Défi personnel/ }).click();
    await expect(ownerPage.getByLabel("Personne visée")).toBeVisible();
  });

  test("refuses a title that is too short", async ({ ownerPage }) => {
    await ownerPage.goto(`/g/${world.groupId}/achievements/new`);

    await ownerPage.getByLabel("Titre").fill("ab");
    await ownerPage.getByLabel("Catégorie").click();
    await ownerPage.getByRole("option", { name: "Sport" }).click();
    await ownerPage.getByRole("button", { name: /Créer l'achievement/ }).click();

    await expect(ownerPage.getByText(/au moins 3 caractères/)).toBeVisible();
  });
});

test.describe("thread", () => {
  test("a member can post a message", async ({ memberPage }) => {
    await memberPage.goto(`/g/${world.groupId}/achievements/${world.raceId}`);

    await memberPage
      .getByPlaceholder("Écrire un message…")
      .fill("Je viens de finir !");
    await memberPage.getByRole("button", { name: "Envoyer" }).click();

    await expect(memberPage.getByText("Je viens de finir !")).toBeVisible();
  });

  test("refuses an empty message", async ({ memberPage }) => {
    await memberPage.goto(`/g/${world.groupId}/achievements/${world.raceId}`);

    await memberPage.getByRole("button", { name: "Envoyer" }).click();

    await expect(
      memberPage.getByText(/Écris un message ou joins une image/),
    ).toBeVisible();
  });
});
