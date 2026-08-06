import { describe, expect, it } from "vitest";
import {
  closeValidationEarly,
  createAchievement,
  deleteAchievement,
  deleteMessage,
  postMessage,
  submitCompletion,
  voteEstimation,
  voteValidation,
} from "@/app/(app)/g/[groupId]/achievements/actions";
import {
  actAs,
  captureRedirect,
  formData,
  hoursFromNow,
  karmaOf,
  makeAchievement,
  makeCategory,
  makeGroup,
  makeUser,
  prisma,
} from "../db";
import { NotFoundError } from "../mocks";

function pngFile(name = "proof.png") {
  return new File([new Uint8Array([137, 80, 78, 71])], name, {
    type: "image/png",
  });
}

async function world() {
  const owner = await makeUser({ name: "Owner" });
  const member = await makeUser({ name: "Member" });
  const other = await makeUser({ name: "Other" });
  const outsider = await makeUser({ name: "Outsider" });
  const category = await makeCategory();
  const group = await makeGroup(owner.id, { memberIds: [member.id, other.id] });
  return { owner, member, other, outsider, category, group };
}

describe("createAchievement", () => {
  it("lets the owner fix the karma value without a vote", async () => {
    const { owner, group, category } = await world();
    actAs(owner);

    await captureRedirect(() =>
      createAchievement(
        group.id,
        null,
        formData({
          title: "Courir 10 km",
          description: "Avec preuve",
          categoryId: category.id,
          mode: "OPEN",
          durationDays: "7",
          points: "50",
        }),
      ),
    );

    const achievement = await prisma.achievement.findFirstOrThrow();
    expect(achievement.status).toBe("ACTIVE");
    expect(achievement.basePoints).toBe(50);
    expect(achievement.estimationClosesAt).toBeNull();
  });

  it("sends a plain member's achievement to a community estimation vote", async () => {
    const { member, group, category } = await world();
    actAs(member);

    await captureRedirect(() =>
      createAchievement(
        group.id,
        null,
        formData({
          title: "Faire un marathon",
          categoryId: category.id,
          mode: "OPEN",
          durationDays: "30",
          points: "9999",
        }),
      ),
    );

    const achievement = await prisma.achievement.findFirstOrThrow();
    expect(achievement.status).toBe("ESTIMATING");
    // The submitted value must not leak through — the group decides.
    expect(achievement.basePoints).toBeNull();
    expect(achievement.estimationClosesAt).not.toBeNull();
  });

  it("lets a platform admin fix the value even as a plain member", async () => {
    const { group, category } = await world();
    const admin = await makeUser({ isPlatformAdmin: true });
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: admin.id, tokens: 100 },
    });
    actAs({ ...admin, isPlatformAdmin: true });

    await captureRedirect(() =>
      createAchievement(
        group.id,
        null,
        formData({
          title: "Défi admin",
          categoryId: category.id,
          mode: "OPEN",
          durationDays: "5",
          points: "80",
        }),
      ),
    );

    const achievement = await prisma.achievement.findFirstOrThrow();
    expect(achievement.status).toBe("ACTIVE");
    expect(achievement.basePoints).toBe(80);
  });

  it("records a personal challenge against the named member", async () => {
    const { owner, member, group, category } = await world();
    actAs(owner);

    await captureRedirect(() =>
      createAchievement(
        group.id,
        null,
        formData({
          title: "Member va courir",
          categoryId: category.id,
          mode: "PERSONAL",
          targetUserId: member.id,
          durationDays: "3",
          points: "30",
        }),
      ),
    );

    const achievement = await prisma.achievement.findFirstOrThrow();
    expect(achievement.mode).toBe("PERSONAL");
    expect(achievement.targetUserId).toBe(member.id);
  });

  it("drops the target on an open competition", async () => {
    const { owner, member, group, category } = await world();
    actAs(owner);

    await captureRedirect(() =>
      createAchievement(
        group.id,
        null,
        formData({
          title: "Compétition",
          categoryId: category.id,
          mode: "OPEN",
          targetUserId: member.id,
          durationDays: "3",
          points: "30",
        }),
      ),
    );

    const achievement = await prisma.achievement.findFirstOrThrow();
    expect(achievement.targetUserId).toBeNull();
  });

  it("refuses a personal challenge with no target", async () => {
    const { owner, group, category } = await world();
    actAs(owner);

    const result = await createAchievement(
      group.id,
      null,
      formData({
        title: "Sans cible",
        categoryId: category.id,
        mode: "PERSONAL",
        durationDays: "3",
        points: "30",
      }),
    );

    expect(result?.error).toBeTruthy();
    expect(await prisma.achievement.count()).toBe(0);
  });

  it("refuses to target somebody outside the group", async () => {
    const { owner, outsider, group, category } = await world();
    actAs(owner);

    const result = await createAchievement(
      group.id,
      null,
      formData({
        title: "Cible externe",
        categoryId: category.id,
        mode: "PERSONAL",
        targetUserId: outsider.id,
        durationDays: "3",
        points: "30",
      }),
    );

    expect(result?.error).toBeTruthy();
    expect(await prisma.achievement.count()).toBe(0);
  });

  it.each([
    ["titre trop court", { title: "ab" }],
    ["catégorie manquante", { categoryId: "" }],
    ["délai nul", { durationDays: "0" }],
    ["délai négatif", { durationDays: "-5" }],
    ["délai non numérique", { durationDays: "bientôt" }],
    ["points négatifs", { points: "-10" }],
  ])("refuses %s", async (_label, override) => {
    const { owner, group, category } = await world();
    actAs(owner);

    const result = await createAchievement(
      group.id,
      null,
      formData({
        title: "Un titre correct",
        categoryId: category.id,
        mode: "OPEN",
        durationDays: "7",
        points: "50",
        ...override,
      }),
    );

    expect(result?.error).toBeTruthy();
    expect(await prisma.achievement.count()).toBe(0);
  });

  it("hides the group from a non-member", async () => {
    const { outsider, group, category } = await world();
    actAs(outsider);

    await expect(
      createAchievement(
        group.id,
        null,
        formData({
          title: "Intrusion",
          categoryId: category.id,
          mode: "OPEN",
          durationDays: "7",
        }),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("keeps the template it was created from, without skipping the vote", async () => {
    const { member, group, category } = await world();
    const template = await prisma.achievementTemplate.create({
      data: {
        title: "Modèle",
        description: "",
        mode: "OPEN",
        points: 70,
        durationDays: 10,
        categoryId: category.id,
      },
    });
    actAs(member);

    await captureRedirect(() =>
      createAchievement(
        group.id,
        null,
        formData({
          title: "Depuis un modèle",
          categoryId: category.id,
          mode: "OPEN",
          durationDays: "10",
          templateId: template.id,
        }),
      ),
    );

    const achievement = await prisma.achievement.findFirstOrThrow();
    expect(achievement.templateId).toBe(template.id);
    // A plain member using a template still has to face the estimation vote.
    expect(achievement.status).toBe("ESTIMATING");
  });
});

describe("voteEstimation", () => {
  it("records and then replaces a member's estimate", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: member.id,
      categoryId: category.id,
      status: "ESTIMATING",
      basePoints: null,
      estimationClosesInHours: 24,
    });
    actAs(owner);

    await voteEstimation(group.id, achievement.id, 40);
    await voteEstimation(group.id, achievement.id, 60);

    const votes = await prisma.estimationVote.findMany({
      where: { achievementId: achievement.id },
    });
    expect(votes).toHaveLength(1);
    expect(votes[0].points).toBe(60);
  });

  it("ignores a vote on an achievement that is no longer estimating", async () => {
    const { owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      status: "ACTIVE",
    });
    actAs(owner);

    await voteEstimation(group.id, achievement.id, 40);

    expect(await prisma.estimationVote.count()).toBe(0);
  });

  it.each([-5, Number.NaN])("ignores the invalid estimate %j", async (points) => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: member.id,
      categoryId: category.id,
      status: "ESTIMATING",
      basePoints: null,
      estimationClosesInHours: 24,
    });
    actAs(owner);

    await voteEstimation(group.id, achievement.id, points);

    expect(await prisma.estimationVote.count()).toBe(0);
  });
});

describe("submitCompletion", () => {
  it("stores the proof and opens the validation window", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    actAs(member);

    const result = await submitCompletion(
      group.id,
      achievement.id,
      null,
      formData({ proof: pngFile(), note: "C'était dur" }),
    );

    expect(result).toBeNull();
    const completion = await prisma.completion.findFirstOrThrow();
    expect(completion.status).toBe("PENDING");
    expect(completion.note).toBe("C'était dur");
    expect(completion.proofUrl).toMatch(/^\/api\/uploads\//);
    expect(completion.voteClosesAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("requires a proof", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    actAs(member);

    const result = await submitCompletion(
      group.id,
      achievement.id,
      null,
      formData({ note: "sans preuve" }),
    );

    expect(result?.error).toBeTruthy();
    expect(await prisma.completion.count()).toBe(0);
  });

  it("refuses a disallowed file type", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    actAs(member);

    const result = await submitCompletion(
      group.id,
      achievement.id,
      null,
      formData({
        proof: new File(["#!/bin/sh"], "evil.sh", { type: "application/x-sh" }),
      }),
    );

    expect(result?.error).toBeTruthy();
    expect(await prisma.completion.count()).toBe(0);
  });

  it("only lets the targeted member attempt a personal challenge", async () => {
    const { owner, member, other, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      mode: "PERSONAL",
      targetUserId: member.id,
    });

    actAs(other);
    const denied = await submitCompletion(
      group.id,
      achievement.id,
      null,
      formData({ proof: pngFile() }),
    );
    expect(denied?.error).toBeTruthy();

    actAs(member);
    const allowed = await submitCompletion(
      group.id,
      achievement.id,
      null,
      formData({ proof: pngFile() }),
    );
    expect(allowed).toBeNull();
  });

  it.each(["ESTIMATING", "RESOLVED", "CANCELLED"])(
    "refuses a submission while the achievement is %s",
    async (status) => {
      const { owner, member, group, category } = await world();
      const achievement = await makeAchievement({
        groupId: group.id,
        creatorId: owner.id,
        categoryId: category.id,
        status,
      });
      actAs(member);

      const result = await submitCompletion(
        group.id,
        achievement.id,
        null,
        formData({ proof: pngFile() }),
      );

      expect(result?.error).toBeTruthy();
    },
  );

  it("blocks a second attempt while one is pending", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    actAs(member);

    await submitCompletion(group.id, achievement.id, null, formData({ proof: pngFile() }));
    const second = await submitCompletion(
      group.id,
      achievement.id,
      null,
      formData({ proof: pngFile() }),
    );

    expect(second?.error).toBeTruthy();
    expect(await prisma.completion.count()).toBe(1);
  });

  it("allows a retry after a rejection", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    await prisma.completion.create({
      data: {
        achievementId: achievement.id,
        userId: member.id,
        proofUrl: "/x.png",
        status: "REJECTED",
        voteClosesAt: hoursFromNow(-1),
        resolvedAt: new Date(),
      },
    });
    actAs(member);

    const result = await submitCompletion(
      group.id,
      achievement.id,
      null,
      formData({ proof: pngFile() }),
    );

    expect(result).toBeNull();
    expect(await prisma.completion.count()).toBe(2);
  });

  it("blocks a second attempt once already validated", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    await prisma.completion.create({
      data: {
        achievementId: achievement.id,
        userId: member.id,
        proofUrl: "/x.png",
        status: "VALIDATED",
        awardedPoints: 50,
        rank: 1,
        voteClosesAt: hoursFromNow(-1),
      },
    });
    actAs(member);

    const result = await submitCompletion(
      group.id,
      achievement.id,
      null,
      formData({ proof: pngFile() }),
    );

    expect(result?.error).toBeTruthy();
  });
});

describe("voteValidation", () => {
  async function pendingProof() {
    const context = await world();
    const achievement = await makeAchievement({
      groupId: context.group.id,
      creatorId: context.owner.id,
      categoryId: context.category.id,
      basePoints: 50,
    });
    const completion = await prisma.completion.create({
      data: {
        achievementId: achievement.id,
        userId: context.member.id,
        proofUrl: "/x.png",
        voteClosesAt: hoursFromNow(24),
      },
    });
    return { ...context, achievement, completion };
  }

  it("records an approval with its karma value", async () => {
    const { owner, group, completion } = await pendingProof();
    actAs(owner);

    await voteValidation(group.id, completion.id, "VALIDATE", 45);

    const vote = await prisma.validationVote.findFirstOrThrow();
    expect(vote.decision).toBe("VALIDATE");
    expect(vote.points).toBe(45);
  });

  it("stores no karma on a rejection", async () => {
    const { owner, group, completion } = await pendingProof();
    actAs(owner);

    await voteValidation(group.id, completion.id, "REJECT", 40);

    const vote = await prisma.validationVote.findFirstOrThrow();
    expect(vote.points).toBeNull();
  });

  it("accepts an explicit zero — the 'free achievement' case", async () => {
    const { owner, group, completion } = await pendingProof();
    actAs(owner);

    await voteValidation(group.id, completion.id, "VALIDATE", 0);

    const vote = await prisma.validationVote.findFirstOrThrow();
    expect(vote.points).toBe(0);
  });

  it("clamps a negative karma vote to zero", async () => {
    const { owner, group, completion } = await pendingProof();
    actAs(owner);

    await voteValidation(group.id, completion.id, "VALIDATE", -20);

    const vote = await prisma.validationVote.findFirstOrThrow();
    expect(vote.points).toBe(0);
  });

  it("replaces a member's earlier vote rather than stacking", async () => {
    const { owner, group, completion } = await pendingProof();
    actAs(owner);

    await voteValidation(group.id, completion.id, "VALIDATE", 30);
    await voteValidation(group.id, completion.id, "REJECT", null);

    const votes = await prisma.validationVote.findMany();
    expect(votes).toHaveLength(1);
    expect(votes[0].decision).toBe("REJECT");
  });

  it("refuses to let someone judge their own proof", async () => {
    const { member, group, completion } = await pendingProof();
    actAs(member);

    await voteValidation(group.id, completion.id, "VALIDATE", 50);

    expect(await prisma.validationVote.count()).toBe(0);
  });

  it("ignores a vote on an already-resolved proof", async () => {
    const { owner, group, completion } = await pendingProof();
    await prisma.completion.update({
      where: { id: completion.id },
      data: { status: "VALIDATED" },
    });
    actAs(owner);

    await voteValidation(group.id, completion.id, "VALIDATE", 50);

    expect(await prisma.validationVote.count()).toBe(0);
  });

  it("hides the proof from a non-member", async () => {
    const { outsider, group, completion } = await pendingProof();
    actAs(outsider);

    await expect(
      voteValidation(group.id, completion.id, "VALIDATE", 50),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("closeValidationEarly", () => {
  it("lets the owner settle a proof before the window ends", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      basePoints: 40,
    });
    const completion = await prisma.completion.create({
      data: {
        achievementId: achievement.id,
        userId: member.id,
        proofUrl: "/x.png",
        voteClosesAt: hoursFromNow(24),
      },
    });
    actAs(owner);

    await closeValidationEarly(group.id, completion.id);

    const resolved = await prisma.completion.findUniqueOrThrow({
      where: { id: completion.id },
    });
    expect(resolved.status).toBe("VALIDATED");
    expect(await karmaOf(group.id, member.id)).toBe(40);
  });

  it("does nothing for a plain member", async () => {
    const { owner, member, other, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    const completion = await prisma.completion.create({
      data: {
        achievementId: achievement.id,
        userId: member.id,
        proofUrl: "/x.png",
        voteClosesAt: hoursFromNow(24),
      },
    });
    actAs(other);

    await closeValidationEarly(group.id, completion.id);

    const untouched = await prisma.completion.findUniqueOrThrow({
      where: { id: completion.id },
    });
    expect(untouched.status).toBe("PENDING");
  });
});

describe("thread messages", () => {
  it("posts a text message", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    actAs(member);

    const result = await postMessage(
      group.id,
      achievement.id,
      null,
      formData({ body: "Bien joué" }),
    );

    expect(result).toBeNull();
    const message = await prisma.message.findFirstOrThrow();
    expect(message.body).toBe("Bien joué");
    expect(message.imageUrl).toBeNull();
  });

  it("accepts an image with no text", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    actAs(member);

    const result = await postMessage(
      group.id,
      achievement.id,
      null,
      formData({ body: "", image: pngFile() }),
    );

    expect(result).toBeNull();
    const message = await prisma.message.findFirstOrThrow();
    expect(message.imageUrl).toMatch(/^\/api\/uploads\//);
  });

  it("refuses an entirely empty message", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    actAs(member);

    const result = await postMessage(
      group.id,
      achievement.id,
      null,
      formData({ body: "   " }),
    );

    expect(result?.error).toBeTruthy();
    expect(await prisma.message.count()).toBe(0);
  });

  it("does not turn a thread attachment into a completion", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    actAs(member);

    await postMessage(
      group.id,
      achievement.id,
      null,
      formData({ body: "Photo random", image: pngFile() }),
    );

    expect(await prisma.completion.count()).toBe(0);
  });

  it("lets the author delete their own message", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    const message = await prisma.message.create({
      data: { achievementId: achievement.id, userId: member.id, body: "oops" },
    });
    actAs(member);

    await deleteMessage(group.id, message.id);

    const deleted = await prisma.message.findUniqueOrThrow({
      where: { id: message.id },
    });
    expect(deleted.deletedAt).not.toBeNull();
  });

  it("lets the group owner moderate a message", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    const message = await prisma.message.create({
      data: { achievementId: achievement.id, userId: member.id, body: "spam" },
    });
    actAs(owner);

    await deleteMessage(group.id, message.id);

    const deleted = await prisma.message.findUniqueOrThrow({
      where: { id: message.id },
    });
    expect(deleted.deletedAt).not.toBeNull();
  });

  it("refuses to let one member delete another's message", async () => {
    const { owner, member, other, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    const message = await prisma.message.create({
      data: { achievementId: achievement.id, userId: member.id, body: "à moi" },
    });
    actAs(other);

    await deleteMessage(group.id, message.id);

    const untouched = await prisma.message.findUniqueOrThrow({
      where: { id: message.id },
    });
    expect(untouched.deletedAt).toBeNull();
  });
});

describe("deleteAchievement", () => {
  it("lets the creator withdraw an untouched achievement", async () => {
    const { member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: member.id,
      categoryId: category.id,
    });
    actAs(member);

    await captureRedirect(() => deleteAchievement(group.id, achievement.id));

    const deleted = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    expect(deleted.deletedAt).not.toBeNull();
    expect(deleted.status).toBe("CANCELLED");
  });

  it("stops the creator once somebody has attempted it", async () => {
    const { member, other, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: member.id,
      categoryId: category.id,
    });
    await prisma.completion.create({
      data: {
        achievementId: achievement.id,
        userId: other.id,
        proofUrl: "/x.png",
        voteClosesAt: hoursFromNow(12),
      },
    });
    actAs(member);

    await deleteAchievement(group.id, achievement.id);

    const untouched = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    expect(untouched.deletedAt).toBeNull();
  });

  it("lets the group owner remove it even with attempts", async () => {
    const { owner, member, other, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: member.id,
      categoryId: category.id,
    });
    await prisma.completion.create({
      data: {
        achievementId: achievement.id,
        userId: other.id,
        proofUrl: "/x.png",
        voteClosesAt: hoursFromNow(12),
      },
    });
    actAs(owner);

    await captureRedirect(() => deleteAchievement(group.id, achievement.id));

    const deleted = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    expect(deleted.deletedAt).not.toBeNull();
  });

  it("refuses an unrelated member", async () => {
    const { member, other, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: member.id,
      categoryId: category.id,
    });
    actAs(other);

    await deleteAchievement(group.id, achievement.id);

    const untouched = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    expect(untouched.deletedAt).toBeNull();
  });
});
