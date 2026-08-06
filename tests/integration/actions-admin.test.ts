import { describe, expect, it } from "vitest";
import {
  createCategory,
  createTemplate,
  deleteCategory,
  deleteTemplate,
  moderateAchievement,
  moderateMessage,
  renameCategory,
  updateTemplate,
} from "@/app/(app)/admin/actions";
import {
  actAs,
  actAsGuest,
  formData,
  makeAchievement,
  makeCategory,
  makeGroup,
  makeUser,
  prisma,
} from "../db";
import { NotFoundError, RedirectError } from "../mocks";

const admin = () => makeUser({ name: "Admin", isPlatformAdmin: true });

describe("categories", () => {
  it("creates a category with a URL-safe slug", async () => {
    actAs(await admin());

    const result = await createCategory(null, formData({ name: "Créativité" }));

    expect(result).toBeNull();
    const category = await prisma.category.findFirstOrThrow();
    expect(category.name).toBe("Créativité");
    expect(category.slug).toBe("creativite");
  });

  it.each([
    ["Sport & Loisirs", "sport-loisirs"],
    ["  Voyage  ", "voyage"],
    ["ÉTÉ 2026", "ete-2026"],
  ])("slugifies %j to %j", async (name, slug) => {
    actAs(await admin());
    await createCategory(null, formData({ name }));
    const category = await prisma.category.findFirstOrThrow();
    expect(category.slug).toBe(slug);
  });

  it("refuses a duplicate", async () => {
    actAs(await admin());
    await createCategory(null, formData({ name: "Sport" }));
    const second = await createCategory(null, formData({ name: "sport" }));

    expect(second?.error).toBeTruthy();
    expect(await prisma.category.count()).toBe(1);
  });

  it.each(["", "a", " "])("refuses the name %j", async (name) => {
    actAs(await admin());
    const result = await createCategory(null, formData({ name }));
    expect(result?.error).toBeTruthy();
  });

  it("refuses a name that slugifies to nothing", async () => {
    actAs(await admin());
    const result = await createCategory(null, formData({ name: "!!!!" }));
    expect(result?.error).toBeTruthy();
    expect(await prisma.category.count()).toBe(0);
  });

  it("renames without touching the slug, so filter links keep working", async () => {
    actAs(await admin());
    const category = await makeCategory("Sport");

    await renameCategory(category.id, "Sport & fitness");

    const renamed = await prisma.category.findUniqueOrThrow({
      where: { id: category.id },
    });
    expect(renamed.name).toBe("Sport & fitness");
    expect(renamed.slug).toBe(category.slug);
  });

  it("refuses an empty rename", async () => {
    actAs(await admin());
    const category = await makeCategory("Sport");

    const result = await renameCategory(category.id, " ");

    expect(result?.error).toBeTruthy();
  });

  it("deletes an unused category", async () => {
    actAs(await admin());
    const category = await makeCategory();

    await deleteCategory(category.id);

    expect(await prisma.category.count()).toBe(0);
  });

  it("refuses to delete a category in use", async () => {
    actAs(await admin());
    const owner = await makeUser();
    const category = await makeCategory();
    const group = await makeGroup(owner.id);
    await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });

    await deleteCategory(category.id);

    expect(await prisma.category.count()).toBe(1);
  });
});

describe("templates", () => {
  it("creates a template", async () => {
    actAs(await admin());
    const category = await makeCategory();

    const result = await createTemplate(
      null,
      formData({
        title: "Courir 10 km",
        description: "Capture obligatoire",
        categoryId: category.id,
        mode: "OPEN",
        points: "50",
        durationDays: "14",
      }),
    );

    expect(result).toBeNull();
    const template = await prisma.achievementTemplate.findFirstOrThrow();
    expect(template.points).toBe(50);
    expect(template.durationDays).toBe(14);
  });

  it.each([
    ["titre trop court", { title: "ab" }],
    ["catégorie manquante", { categoryId: "" }],
    ["points négatifs", { points: "-1" }],
    ["délai nul", { durationDays: "0" }],
  ])("refuses %s", async (_label, override) => {
    actAs(await admin());
    const category = await makeCategory();

    const result = await createTemplate(
      null,
      formData({
        title: "Titre correct",
        categoryId: category.id,
        mode: "OPEN",
        points: "50",
        durationDays: "7",
        ...override,
      }),
    );

    expect(result?.error).toBeTruthy();
    expect(await prisma.achievementTemplate.count()).toBe(0);
  });

  it("updates a template", async () => {
    actAs(await admin());
    const category = await makeCategory();
    const template = await prisma.achievementTemplate.create({
      data: {
        title: "Ancien",
        description: "",
        mode: "OPEN",
        points: 10,
        durationDays: 3,
        categoryId: category.id,
      },
    });

    const result = await updateTemplate(
      template.id,
      null,
      formData({
        title: "Nouveau",
        description: "Mis à jour",
        categoryId: category.id,
        mode: "PERSONAL",
        points: "75",
        durationDays: "21",
      }),
    );

    expect(result).toBeNull();
    const updated = await prisma.achievementTemplate.findUniqueOrThrow({
      where: { id: template.id },
    });
    expect(updated.title).toBe("Nouveau");
    expect(updated.mode).toBe("PERSONAL");
    expect(updated.points).toBe(75);
  });

  it("deletes a template", async () => {
    actAs(await admin());
    const category = await makeCategory();
    const template = await prisma.achievementTemplate.create({
      data: {
        title: "À supprimer",
        description: "",
        mode: "OPEN",
        points: 10,
        durationDays: 3,
        categoryId: category.id,
      },
    });

    await deleteTemplate(template.id);

    expect(await prisma.achievementTemplate.count()).toBe(0);
  });
});

describe("global moderation", () => {
  async function contentInAForeignGroup() {
    const owner = await makeUser();
    const category = await makeCategory();
    const group = await makeGroup(owner.id);
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      title: "Contenu litigieux",
    });
    const message = await prisma.message.create({
      data: { achievementId: achievement.id, userId: owner.id, body: "spam" },
    });
    return { owner, group, achievement, message };
  }

  it("removes an achievement from a group the admin does not belong to", async () => {
    const { achievement, group } = await contentInAForeignGroup();
    const platformAdmin = await admin();
    actAs(platformAdmin);

    // The admin is deliberately not a member of this group.
    expect(
      await prisma.groupMember.findUnique({
        where: {
          groupId_userId: { groupId: group.id, userId: platformAdmin.id },
        },
      }),
    ).toBeNull();

    await moderateAchievement(achievement.id);

    const removed = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    expect(removed.deletedAt).not.toBeNull();
    expect(removed.status).toBe("CANCELLED");
  });

  it("records the removal in the group's activity feed", async () => {
    const { achievement, group } = await contentInAForeignGroup();
    actAs(await admin());

    await moderateAchievement(achievement.id);

    const activities = await prisma.activity.findMany({
      where: { groupId: group.id },
    });
    expect(activities.some((a) => a.message.includes("administrateur"))).toBe(
      true,
    );
  });

  it("removes a message from a foreign group", async () => {
    const { message } = await contentInAForeignGroup();
    actAs(await admin());

    await moderateMessage(message.id);

    const removed = await prisma.message.findUniqueOrThrow({
      where: { id: message.id },
    });
    expect(removed.deletedAt).not.toBeNull();
  });

  it("is idempotent on already-removed content", async () => {
    const { achievement } = await contentInAForeignGroup();
    actAs(await admin());

    await moderateAchievement(achievement.id);
    const firstPass = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    await moderateAchievement(achievement.id);
    const secondPass = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });

    expect(secondPass.deletedAt).toEqual(firstPass.deletedAt);
  });

  it("ignores unknown ids", async () => {
    actAs(await admin());
    await expect(moderateAchievement("nope")).resolves.toBeUndefined();
    await expect(moderateMessage("nope")).resolves.toBeUndefined();
  });
});

describe("admin authorisation", () => {
  it("refuses a signed-in non-admin on every admin action", async () => {
    const category = await makeCategory();
    const owner = await makeUser();
    const group = await makeGroup(owner.id);
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    const message = await prisma.message.create({
      data: { achievementId: achievement.id, userId: owner.id, body: "hello" },
    });

    actAs(await makeUser({ isPlatformAdmin: false }));

    await expect(
      createCategory(null, formData({ name: "Pirate" })),
    ).rejects.toThrow(NotFoundError);
    await expect(renameCategory(category.id, "Pirate")).rejects.toThrow(
      NotFoundError,
    );
    await expect(deleteCategory(category.id)).rejects.toThrow(NotFoundError);
    await expect(
      createTemplate(
        null,
        formData({
          title: "Pirate",
          categoryId: category.id,
          mode: "OPEN",
          points: "10",
          durationDays: "3",
        }),
      ),
    ).rejects.toThrow(NotFoundError);
    await expect(moderateAchievement(achievement.id)).rejects.toThrow(
      NotFoundError,
    );
    await expect(moderateMessage(message.id)).rejects.toThrow(NotFoundError);

    // Nothing changed.
    expect(await prisma.category.count()).toBe(1);
    expect(await prisma.achievementTemplate.count()).toBe(0);
    const untouched = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    expect(untouched.deletedAt).toBeNull();
  });

  it("sends a guest to the login page", async () => {
    actAsGuest();
    await expect(
      createCategory(null, formData({ name: "Anonyme" })),
    ).rejects.toThrow(RedirectError);
  });
});
