import { describe, expect, it } from "vitest";
import { runGroupTick, resolveCompletion } from "@/lib/tick";
import { DEFAULT_POINTS, INACTIVITY_REMINDER_DAYS } from "@/lib/constants";
import {
  hoursFromNow,
  karmaOf,
  makeAchievement,
  makeBet,
  makeCategory,
  makeGroup,
  makeUser,
  prisma,
  stake,
  tokensOf,
} from "../db";

async function world(memberCount = 3) {
  const users = [];
  for (let i = 0; i < memberCount; i++) users.push(await makeUser());
  const [owner, ...rest] = users;
  const category = await makeCategory();
  const group = await makeGroup(owner.id, { memberIds: rest.map((u) => u.id) });
  return { users, owner, group, category };
}

function submitProof(achievementId: string, userId: string, closesInHours: number) {
  return prisma.completion.create({
    data: {
      achievementId,
      userId,
      proofUrl: "/api/uploads/proof.png",
      voteClosesAt: hoursFromNow(closesInHours),
    },
  });
}

describe("estimation vote", () => {
  it("settles to the average of the votes and activates the achievement", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      status: "ESTIMATING",
      basePoints: null,
      estimationClosesInHours: -1,
    });

    await prisma.estimationVote.createMany({
      data: [
        { achievementId: achievement.id, userId: users[0].id, points: 40 },
        { achievementId: achievement.id, userId: users[1].id, points: 60 },
        { achievementId: achievement.id, userId: users[2].id, points: 50 },
      ],
    });

    await runGroupTick(group.id);

    const settled = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    expect(settled.status).toBe("ACTIVE");
    expect(settled.basePoints).toBe(50);
    expect(settled.estimationClosesAt).toBeNull();
  });

  it("rounds a fractional average", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      status: "ESTIMATING",
      basePoints: null,
      estimationClosesInHours: -1,
    });
    await prisma.estimationVote.createMany({
      data: [
        { achievementId: achievement.id, userId: users[0].id, points: 10 },
        { achievementId: achievement.id, userId: users[1].id, points: 15 },
      ],
    });

    await runGroupTick(group.id);

    const settled = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    expect(settled.basePoints).toBe(13);
  });

  it("falls back to the default value when nobody voted", async () => {
    const { owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      status: "ESTIMATING",
      basePoints: null,
      estimationClosesInHours: -1,
    });

    await runGroupTick(group.id);

    const settled = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    expect(settled.basePoints).toBe(DEFAULT_POINTS);
  });

  it("leaves a vote that has not closed yet alone", async () => {
    const { owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      status: "ESTIMATING",
      basePoints: null,
      estimationClosesInHours: 12,
    });

    await runGroupTick(group.id);

    const untouched = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    expect(untouched.status).toBe("ESTIMATING");
    expect(untouched.basePoints).toBeNull();
  });
});

describe("validation vote", () => {
  it("awards the voted average and credits karma", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      basePoints: 50,
    });
    const completion = await submitProof(achievement.id, users[1].id, -1);
    await prisma.validationVote.createMany({
      data: [
        { completionId: completion.id, userId: owner.id, decision: "VALIDATE", points: 40 },
        { completionId: completion.id, userId: users[2].id, decision: "VALIDATE", points: 50 },
      ],
    });

    await resolveCompletion(completion.id);

    const resolved = await prisma.completion.findUniqueOrThrow({
      where: { id: completion.id },
    });
    expect(resolved.status).toBe("VALIDATED");
    expect(resolved.awardedPoints).toBe(45);
    expect(resolved.rank).toBe(1);
    expect(await karmaOf(group.id, users[1].id)).toBe(45);
  });

  it("rejects when a majority of voters reject", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    const completion = await submitProof(achievement.id, users[1].id, -1);
    await prisma.validationVote.createMany({
      data: [
        { completionId: completion.id, userId: owner.id, decision: "REJECT" },
        { completionId: completion.id, userId: users[2].id, decision: "REJECT" },
      ],
    });

    await resolveCompletion(completion.id);

    const resolved = await prisma.completion.findUniqueOrThrow({
      where: { id: completion.id },
    });
    expect(resolved.status).toBe("REJECTED");
    expect(resolved.awardedPoints).toBeNull();
    expect(await karmaOf(group.id, users[1].id)).toBe(0);
  });

  it("keeps the achievement done but worth nothing when most vote 0", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      basePoints: 50,
    });
    const completion = await submitProof(achievement.id, users[1].id, -1);
    await prisma.validationVote.createMany({
      data: [
        { completionId: completion.id, userId: owner.id, decision: "VALIDATE", points: 0 },
        { completionId: completion.id, userId: users[2].id, decision: "VALIDATE", points: 0 },
      ],
    });

    await resolveCompletion(completion.id);

    const resolved = await prisma.completion.findUniqueOrThrow({
      where: { id: completion.id },
    });
    expect(resolved.status).toBe("VALIDATED");
    expect(resolved.awardedPoints).toBe(0);
    expect(await karmaOf(group.id, users[1].id)).toBe(0);
  });

  it("passes unopposed at face value when nobody voted", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      basePoints: 30,
    });
    const completion = await submitProof(achievement.id, users[1].id, -1);

    await resolveCompletion(completion.id);

    const resolved = await prisma.completion.findUniqueOrThrow({
      where: { id: completion.id },
    });
    expect(resolved.status).toBe("VALIDATED");
    expect(resolved.awardedPoints).toBe(30);
  });

  it("applies the rank curve to later finishers in a competition", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      mode: "OPEN",
      basePoints: 50,
    });

    const first = await submitProof(achievement.id, users[0].id, -1);
    await resolveCompletion(first.id);
    const second = await submitProof(achievement.id, users[1].id, -1);
    await resolveCompletion(second.id);
    const third = await submitProof(achievement.id, users[2].id, -1);
    await resolveCompletion(third.id);

    const rows = await prisma.completion.findMany({
      where: { achievementId: achievement.id },
      orderBy: { rank: "asc" },
    });
    expect(rows.map((r) => r.awardedPoints)).toEqual([50, 40, 25]);
  });

  it("does not apply the rank curve to a personal challenge", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      mode: "PERSONAL",
      targetUserId: users[1].id,
      basePoints: 40,
    });
    const completion = await submitProof(achievement.id, users[1].id, -1);

    await resolveCompletion(completion.id);

    const resolved = await prisma.completion.findUniqueOrThrow({
      where: { id: completion.id },
    });
    expect(resolved.awardedPoints).toBe(40);
    const achievementAfter = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    expect(achievementAfter.status).toBe("RESOLVED");
  });

  it("is idempotent", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      basePoints: 20,
    });
    const completion = await submitProof(achievement.id, users[1].id, -1);

    await resolveCompletion(completion.id);
    await resolveCompletion(completion.id);

    expect(await karmaOf(group.id, users[1].id)).toBe(20);
  });

  it("leaves a vote whose window is still open untouched", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    const completion = await submitProof(achievement.id, users[1].id, 24);

    await runGroupTick(group.id);

    const pending = await prisma.completion.findUniqueOrThrow({
      where: { id: completion.id },
    });
    expect(pending.status).toBe("PENDING");
  });
});

describe("deadline handling", () => {
  it("closes an expired achievement", async () => {
    const { owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      deadlineHours: -1,
    });

    await runGroupTick(group.id);

    const closed = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    expect(closed.status).toBe("RESOLVED");
  });

  it("pays 'Non' on a personal challenge nobody attempted", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      mode: "PERSONAL",
      targetUserId: owner.id,
      deadlineHours: -1,
    });
    const bet = await makeBet({
      achievementId: achievement.id,
      creatorId: owner.id,
      type: "YES_NO",
    });
    const no = bet.outcomes.find((o) => o.label === "Non")!;
    const yes = bet.outcomes.find((o) => o.label === "Oui")!;
    await stake(group.id, bet.id, no.id, users[1].id, 30);
    await stake(group.id, bet.id, yes.id, users[2].id, 30);

    await runGroupTick(group.id);

    const settled = await prisma.bet.findUniqueOrThrow({ where: { id: bet.id } });
    expect(settled.status).toBe("RESOLVED");
    expect(settled.winningOutcomeId).toBe(no.id);
    expect(await tokensOf(group.id, users[1].id)).toBe(100 - 30 + 60);
  });

  it("holds the bet open while a proof submitted in time is still being judged", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      mode: "PERSONAL",
      targetUserId: owner.id,
      basePoints: 30,
      deadlineHours: -1,
    });
    const bet = await makeBet({
      achievementId: achievement.id,
      creatorId: owner.id,
      type: "YES_NO",
    });
    const yes = bet.outcomes.find((o) => o.label === "Oui")!;
    const no = bet.outcomes.find((o) => o.label === "Non")!;
    await stake(group.id, bet.id, yes.id, users[1].id, 40);
    await stake(group.id, bet.id, no.id, users[2].id, 40);

    const completion = await submitProof(achievement.id, owner.id, 24);

    await runGroupTick(group.id);

    const heldOpen = await prisma.bet.findUniqueOrThrow({ where: { id: bet.id } });
    expect(heldOpen.status).toBe("OPEN");

    // Verdict arrives afterwards: the bet must agree with the karma.
    await resolveCompletion(completion.id);

    const settled = await prisma.bet.findUniqueOrThrow({ where: { id: bet.id } });
    expect(settled.status).toBe("RESOLVED");
    expect(settled.winningOutcomeId).toBe(yes.id);
    expect(await tokensOf(group.id, users[1].id)).toBe(100 - 40 + 80);
    expect(await karmaOf(group.id, owner.id)).toBe(30);
  });

  it("settles a bet left open once the last pending proof is judged", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      mode: "PERSONAL",
      targetUserId: owner.id,
      deadlineHours: -1,
    });
    const bet = await makeBet({
      achievementId: achievement.id,
      creatorId: owner.id,
      type: "YES_NO",
    });
    const no = bet.outcomes.find((o) => o.label === "Non")!;
    await stake(group.id, bet.id, no.id, users[1].id, 10);

    const completion = await submitProof(achievement.id, owner.id, -1);
    await prisma.validationVote.create({
      data: {
        completionId: completion.id,
        userId: users[1].id,
        decision: "REJECT",
      },
    });

    // One tick resolves the rejected proof and then the bet in the same pass.
    await runGroupTick(group.id);

    const settled = await prisma.bet.findUniqueOrThrow({ where: { id: bet.id } });
    expect(settled.status).toBe("RESOLVED");
    expect(settled.winningOutcomeId).toBe(no.id);
  });

  it("resolves a competition bet as soon as a first place is validated", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      mode: "OPEN",
      basePoints: 50,
    });
    const bet = await makeBet({
      achievementId: achievement.id,
      creatorId: owner.id,
      type: "WHO",
      candidateIds: users.map((u) => u.id),
    });
    const onWinner = bet.outcomes.find((o) => o.candidateId === users[1].id)!;
    const onLoser = bet.outcomes.find((o) => o.candidateId === users[2].id)!;
    await stake(group.id, bet.id, onWinner.id, users[0].id, 20);
    await stake(group.id, bet.id, onLoser.id, users[2].id, 20);

    const completion = await submitProof(achievement.id, users[1].id, -1);
    await resolveCompletion(completion.id);

    const settled = await prisma.bet.findUniqueOrThrow({ where: { id: bet.id } });
    expect(settled.status).toBe("RESOLVED");
    expect(settled.winningOutcomeId).toBe(onWinner.id);
    expect(await tokensOf(group.id, users[0].id)).toBe(100 - 20 + 40);
  });

  it("refunds a competition bet nobody won", async () => {
    const { users, owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      mode: "OPEN",
      deadlineHours: -1,
    });
    const bet = await makeBet({
      achievementId: achievement.id,
      creatorId: owner.id,
      type: "WHO",
      candidateIds: users.map((u) => u.id),
    });
    await stake(group.id, bet.id, bet.outcomes[0].id, users[1].id, 25);

    await runGroupTick(group.id);

    const settled = await prisma.bet.findUniqueOrThrow({ where: { id: bet.id } });
    expect(settled.status).toBe("REFUNDED");
    expect(await tokensOf(group.id, users[1].id)).toBe(100);
  });

  it("ignores soft-deleted achievements", async () => {
    const { owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      deadlineHours: -1,
    });
    await prisma.achievement.update({
      where: { id: achievement.id },
      data: { deletedAt: new Date() },
    });

    await runGroupTick(group.id);

    const untouched = await prisma.achievement.findUniqueOrThrow({
      where: { id: achievement.id },
    });
    expect(untouched.status).toBe("ACTIVE");
  });
});

describe("inactivity reminder", () => {
  const longAgo = (days: number) =>
    new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  it("calls out a member who has validated nothing since joining", async () => {
    const { users, group } = await world();
    await prisma.groupMember.updateMany({
      where: { groupId: group.id, userId: users[1].id },
      data: { joinedAt: longAgo(INACTIVITY_REMINDER_DAYS + 5) },
    });

    await runGroupTick(group.id);

    const activities = await prisma.activity.findMany({
      where: { groupId: group.id },
    });
    expect(activities.some((a) => a.message.includes("n'a rien validé"))).toBe(
      true,
    );
  });

  it("does not repeat the reminder on every page load", async () => {
    const { users, group } = await world();
    await prisma.groupMember.updateMany({
      where: { groupId: group.id, userId: users[1].id },
      data: { joinedAt: longAgo(INACTIVITY_REMINDER_DAYS + 5) },
    });

    await runGroupTick(group.id);
    await runGroupTick(group.id);
    await runGroupTick(group.id);

    const nudges = await prisma.activity.findMany({
      where: { groupId: group.id, message: { contains: "n'a rien validé" } },
    });
    expect(nudges).toHaveLength(1);
  });

  it("spares a member who recently validated something", async () => {
    const { users, owner, group, category } = await world();
    await prisma.groupMember.updateMany({
      where: { groupId: group.id },
      data: { joinedAt: longAgo(INACTIVITY_REMINDER_DAYS + 5) },
    });
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    for (const user of users) {
      await prisma.completion.create({
        data: {
          achievementId: achievement.id,
          userId: user.id,
          proofUrl: "/x.png",
          status: "VALIDATED",
          awardedPoints: 10,
          voteClosesAt: longAgo(1),
          resolvedAt: longAgo(1),
        },
      });
    }

    await runGroupTick(group.id);

    const nudges = await prisma.activity.findMany({
      where: { groupId: group.id, message: { contains: "n'a rien validé" } },
    });
    expect(nudges).toHaveLength(0);
  });

  it("spares a brand-new member", async () => {
    const { group } = await world();
    await runGroupTick(group.id);

    const nudges = await prisma.activity.findMany({
      where: { groupId: group.id, message: { contains: "n'a rien validé" } },
    });
    expect(nudges).toHaveLength(0);
  });
});
