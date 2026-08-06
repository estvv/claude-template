import { describe, expect, it } from "vitest";
import { createBet, placeWager } from "@/app/(app)/g/[groupId]/bets/actions";
import {
  actAs,
  makeAchievement,
  makeCategory,
  makeGroup,
  makeUser,
  prisma,
  tokensOf,
} from "../db";
import { NotFoundError } from "../mocks";

async function world() {
  const owner = await makeUser();
  const member = await makeUser();
  const other = await makeUser();
  const outsider = await makeUser();
  const category = await makeCategory();
  const group = await makeGroup(owner.id, { memberIds: [member.id, other.id] });
  return { owner, member, other, outsider, category, group };
}

describe("createBet", () => {
  it("derives a yes/no bet from a personal challenge", async () => {
    const { owner, member, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      mode: "PERSONAL",
      targetUserId: member.id,
    });
    actAs(owner);

    const result = await createBet(group.id, achievement.id);

    expect(result).toBeNull();
    const bet = await prisma.bet.findFirstOrThrow({ include: { outcomes: true } });
    expect(bet.type).toBe("YES_NO");
    expect(bet.outcomes.map((o) => o.label).sort()).toEqual(["Non", "Oui"]);
    expect(bet.outcomes.every((o) => o.candidateId === null)).toBe(true);
  });

  it("derives a 'who wins' bet with one outcome per member", async () => {
    const { owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      mode: "OPEN",
    });
    actAs(owner);

    await createBet(group.id, achievement.id);

    const bet = await prisma.bet.findFirstOrThrow({ include: { outcomes: true } });
    expect(bet.type).toBe("WHO");
    expect(bet.outcomes).toHaveLength(3);
    expect(bet.outcomes.every((o) => o.candidateId !== null)).toBe(true);
  });

  it("allows only one bet per achievement", async () => {
    const { owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    actAs(owner);

    await createBet(group.id, achievement.id);
    const second = await createBet(group.id, achievement.id);

    expect(second?.error).toBeTruthy();
    expect(await prisma.bet.count()).toBe(1);
  });

  it("lets any member open the bet, not just the owner", async () => {
    const { owner, other, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    actAs(other);

    expect(await createBet(group.id, achievement.id)).toBeNull();
  });

  it.each(["ESTIMATING", "RESOLVED", "CANCELLED"])(
    "refuses to open a bet on a %s achievement",
    async (status) => {
      const { owner, group, category } = await world();
      const achievement = await makeAchievement({
        groupId: group.id,
        creatorId: owner.id,
        categoryId: category.id,
        status,
      });
      actAs(owner);

      const result = await createBet(group.id, achievement.id);

      expect(result?.error).toBeTruthy();
      expect(await prisma.bet.count()).toBe(0);
    },
  );

  it("hides the group from a non-member", async () => {
    const { owner, outsider, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    actAs(outsider);

    await expect(createBet(group.id, achievement.id)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("logs the opening to the activity feed", async () => {
    const { owner, group, category } = await world();
    const achievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
      title: "Le grand défi",
    });
    actAs(owner);

    await createBet(group.id, achievement.id);

    const activities = await prisma.activity.findMany({
      where: { groupId: group.id },
    });
    expect(activities.some((a) => a.message.includes("Le grand défi"))).toBe(true);
  });
});

describe("placeWager", () => {
  async function openBet() {
    const context = await world();
    const achievement = await makeAchievement({
      groupId: context.group.id,
      creatorId: context.owner.id,
      categoryId: context.category.id,
      mode: "PERSONAL",
      targetUserId: context.member.id,
    });
    actAs(context.owner);
    await createBet(context.group.id, achievement.id);
    const bet = await prisma.bet.findFirstOrThrow({ include: { outcomes: true } });
    return {
      ...context,
      achievement,
      bet,
      yes: bet.outcomes.find((o) => o.label === "Oui")!,
      no: bet.outcomes.find((o) => o.label === "Non")!,
    };
  }

  it("debits the stake immediately", async () => {
    const { owner, group, bet, yes } = await openBet();
    actAs(owner);

    const result = await placeWager(group.id, bet.id, yes.id, 30);

    expect(result).toBeNull();
    expect(await tokensOf(group.id, owner.id)).toBe(70);
    const wager = await prisma.wager.findFirstOrThrow();
    expect(wager.amount).toBe(30);
    expect(wager.payout).toBeNull();
  });

  it("refuses to stake more than the member holds", async () => {
    const { owner, group, bet, yes } = await openBet();
    actAs(owner);

    const result = await placeWager(group.id, bet.id, yes.id, 101);

    expect(result?.error).toBeTruthy();
    expect(await tokensOf(group.id, owner.id)).toBe(100);
    expect(await prisma.wager.count()).toBe(0);
  });

  it("allows staking the entire balance but never past it", async () => {
    const { owner, group, bet, yes } = await openBet();
    actAs(owner);

    expect(await placeWager(group.id, bet.id, yes.id, 100)).toBeNull();
    expect(await tokensOf(group.id, owner.id)).toBe(0);
  });

  it.each([0, -10, Number.NaN])("refuses the invalid stake %j", async (amount) => {
    const { owner, group, bet, yes } = await openBet();
    actAs(owner);

    const result = await placeWager(group.id, bet.id, yes.id, amount);

    expect(result?.error).toBeTruthy();
    expect(await tokensOf(group.id, owner.id)).toBe(100);
  });

  it("refuses a second position on the same bet", async () => {
    const { owner, group, bet, yes, no } = await openBet();
    actAs(owner);

    await placeWager(group.id, bet.id, yes.id, 10);
    const hedge = await placeWager(group.id, bet.id, no.id, 10);

    expect(hedge?.error).toBeTruthy();
    expect(await prisma.wager.count()).toBe(1);
    expect(await tokensOf(group.id, owner.id)).toBe(90);
  });

  it("lets different members back opposite outcomes", async () => {
    const { owner, member, group, bet, yes, no } = await openBet();

    actAs(owner);
    expect(await placeWager(group.id, bet.id, yes.id, 20)).toBeNull();
    actAs(member);
    expect(await placeWager(group.id, bet.id, no.id, 20)).toBeNull();

    expect(await prisma.wager.count()).toBe(2);
  });

  it("refuses an outcome belonging to another bet", async () => {
    const { owner, group, bet, category } = await openBet();
    const otherAchievement = await makeAchievement({
      groupId: group.id,
      creatorId: owner.id,
      categoryId: category.id,
    });
    actAs(owner);
    await createBet(group.id, otherAchievement.id);
    const otherBet = await prisma.bet.findFirstOrThrow({
      where: { achievementId: otherAchievement.id },
      include: { outcomes: true },
    });

    const result = await placeWager(
      group.id,
      bet.id,
      otherBet.outcomes[0].id,
      10,
    );

    expect(result?.error).toBeTruthy();
    expect(await prisma.wager.count()).toBe(0);
  });

  it("refuses a stake once the bet is settled", async () => {
    const { owner, group, bet, yes } = await openBet();
    await prisma.bet.update({
      where: { id: bet.id },
      data: { status: "RESOLVED" },
    });
    actAs(owner);

    const result = await placeWager(group.id, bet.id, yes.id, 10);

    expect(result?.error).toBeTruthy();
  });

  it("refuses a stake once the achievement is over", async () => {
    const { owner, group, bet, yes, achievement } = await openBet();
    await prisma.achievement.update({
      where: { id: achievement.id },
      data: { status: "RESOLVED" },
    });
    actAs(owner);

    const result = await placeWager(group.id, bet.id, yes.id, 10);

    expect(result?.error).toBeTruthy();
  });

  it("rounds a fractional stake to whole tokens", async () => {
    const { owner, group, bet, yes } = await openBet();
    actAs(owner);

    await placeWager(group.id, bet.id, yes.id, 10.6);

    const wager = await prisma.wager.findFirstOrThrow();
    expect(wager.amount).toBe(11);
    expect(await tokensOf(group.id, owner.id)).toBe(89);
  });

  it("hides the bet from a non-member", async () => {
    const { outsider, group, bet, yes } = await openBet();
    actAs(outsider);

    await expect(placeWager(group.id, bet.id, yes.id, 10)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("keeps a balance from ever going negative across many stakes", async () => {
    const { owner, member, other, group, category } = await world();
    // Each member gets one bet to stake on; none may overdraw.
    for (const user of [owner, member, other]) {
      const achievement = await makeAchievement({
        groupId: group.id,
        creatorId: owner.id,
        categoryId: category.id,
      });
      actAs(owner);
      await createBet(group.id, achievement.id);
      const bet = await prisma.bet.findFirstOrThrow({
        where: { achievementId: achievement.id },
        include: { outcomes: true },
      });
      actAs(user);
      await placeWager(group.id, bet.id, bet.outcomes[0].id, 60);
      await placeWager(group.id, bet.id, bet.outcomes[0].id, 60);
    }

    for (const user of [owner, member, other]) {
      expect(await tokensOf(group.id, user.id)).toBeGreaterThanOrEqual(0);
    }
  });
});
