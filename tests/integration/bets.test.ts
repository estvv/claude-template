import { describe, expect, it } from "vitest";
import { resolveBet } from "@/lib/bets";
import {
  makeAchievement,
  makeBet,
  makeCategory,
  makeGroup,
  makeUser,
  prisma,
  stake,
  tokensOf,
} from "../db";

/** Group of `size` funded members with an open yes/no bet ready to take stakes. */
async function scenario(size = 3, tokens = 200) {
  const users = [];
  for (let i = 0; i < size; i++) users.push(await makeUser());
  const [owner, ...rest] = users;

  const category = await makeCategory();
  const group = await makeGroup(owner.id, {
    memberIds: rest.map((u) => u.id),
    tokens,
  });
  const achievement = await makeAchievement({
    groupId: group.id,
    creatorId: owner.id,
    categoryId: category.id,
    mode: "PERSONAL",
    targetUserId: owner.id,
  });
  const bet = await makeBet({
    achievementId: achievement.id,
    creatorId: owner.id,
    type: "YES_NO",
  });

  return {
    users,
    group,
    achievement,
    bet,
    yes: bet.outcomes.find((o) => o.label === "Oui")!,
    no: bet.outcomes.find((o) => o.label === "Non")!,
  };
}

describe("resolveBet — pari mutuel", () => {
  it("splits the whole pot in proportion to each winning stake", async () => {
    const { users, group, bet, yes, no } = await scenario();
    const [alice, bob, chloe] = users;

    // The worked example in docs/FEATURES.md: pot 180, 80 backing the winner.
    await stake(group.id, bet.id, yes.id, alice.id, 50);
    await stake(group.id, bet.id, yes.id, bob.id, 30);
    await stake(group.id, bet.id, no.id, chloe.id, 100);

    await resolveBet(bet.id, yes.id);

    // 50/80 × 180 = 112.5 → 112, plus the 1-token remainder (largest stake).
    expect(await tokensOf(group.id, alice.id)).toBe(200 - 50 + 113);
    // 30/80 × 180 = 67.5 → 67
    expect(await tokensOf(group.id, bob.id)).toBe(200 - 30 + 67);
    expect(await tokensOf(group.id, chloe.id)).toBe(200 - 100);
  });

  it("never creates or destroys tokens", async () => {
    const { users, group, bet, yes, no } = await scenario();
    const [a, b, c] = users;

    await stake(group.id, bet.id, yes.id, a.id, 37);
    await stake(group.id, bet.id, yes.id, b.id, 11);
    await stake(group.id, bet.id, no.id, c.id, 91);

    await resolveBet(bet.id, yes.id);

    const total =
      (await tokensOf(group.id, a.id)) +
      (await tokensOf(group.id, b.id)) +
      (await tokensOf(group.id, c.id));
    expect(total).toBe(600);
  });

  it.each([
    [[7, 13, 5], 3],
    [[1, 1, 1], 1],
    [[999, 1, 500], 17],
    [[2, 3, 5], 7],
  ])(
    "conserves the pot exactly for stakes %j against %i",
    async (winning, losing) => {
      const { users, group, bet, yes, no } = await scenario(4, 2000);
      const [a, b, c, d] = users;

      await stake(group.id, bet.id, yes.id, a.id, winning[0]);
      await stake(group.id, bet.id, yes.id, b.id, winning[1]);
      await stake(group.id, bet.id, yes.id, c.id, winning[2]);
      await stake(group.id, bet.id, no.id, d.id, losing);

      await resolveBet(bet.id, yes.id);

      const total = (
        await Promise.all(users.map((u) => tokensOf(group.id, u.id)))
      ).reduce((sum, value) => sum + value, 0);
      expect(total).toBe(4 * 2000);
    },
  );

  it("takes no commission — winners share 100% of the pot", async () => {
    const { users, group, bet, yes, no } = await scenario();
    const [a, b, c] = users;

    await stake(group.id, bet.id, yes.id, a.id, 20);
    await stake(group.id, bet.id, no.id, b.id, 30);
    await stake(group.id, bet.id, no.id, c.id, 50);

    await resolveBet(bet.id, no.id);

    const payouts = await prisma.wager.findMany({ where: { betId: bet.id } });
    const distributed = payouts.reduce((sum, w) => sum + (w.payout ?? 0), 0);
    expect(distributed).toBe(100);
  });

  it("refunds everyone when nobody backed the winning outcome", async () => {
    const { users, group, bet, yes, no } = await scenario();
    const [a, b] = users;

    await stake(group.id, bet.id, no.id, a.id, 40);
    await stake(group.id, bet.id, no.id, b.id, 60);

    await resolveBet(bet.id, yes.id);

    expect(await tokensOf(group.id, a.id)).toBe(200);
    expect(await tokensOf(group.id, b.id)).toBe(200);

    const resolved = await prisma.bet.findUniqueOrThrow({ where: { id: bet.id } });
    expect(resolved.status).toBe("REFUNDED");
    expect(resolved.winningOutcomeId).toBeNull();
  });

  it("refunds when the winning outcome is unknown", async () => {
    const { users, group, bet, yes } = await scenario();
    const [a] = users;

    await stake(group.id, bet.id, yes.id, a.id, 25);
    await resolveBet(bet.id, null);

    expect(await tokensOf(group.id, a.id)).toBe(200);
    const resolved = await prisma.bet.findUniqueOrThrow({ where: { id: bet.id } });
    expect(resolved.status).toBe("REFUNDED");
  });

  it("handles a bet nobody staked on", async () => {
    const { bet, yes } = await scenario();
    await resolveBet(bet.id, yes.id);

    const resolved = await prisma.bet.findUniqueOrThrow({ where: { id: bet.id } });
    expect(resolved.status).toBe("REFUNDED");
  });

  it("gives the sole backer the entire pot", async () => {
    const { users, group, bet, yes, no } = await scenario();
    const [a, b, c] = users;

    await stake(group.id, bet.id, yes.id, a.id, 10);
    await stake(group.id, bet.id, no.id, b.id, 40);
    await stake(group.id, bet.id, no.id, c.id, 50);

    await resolveBet(bet.id, yes.id);

    expect(await tokensOf(group.id, a.id)).toBe(200 - 10 + 100);
  });

  it("returns each stake untouched when everyone picked the winner", async () => {
    const { users, group, bet, yes } = await scenario();
    const [a, b] = users;

    await stake(group.id, bet.id, yes.id, a.id, 30);
    await stake(group.id, bet.id, yes.id, b.id, 70);

    await resolveBet(bet.id, yes.id);

    expect(await tokensOf(group.id, a.id)).toBe(200);
    expect(await tokensOf(group.id, b.id)).toBe(200);
  });

  it("records a zero payout for losers", async () => {
    const { users, group, bet, yes, no } = await scenario();
    const [a, b] = users;

    await stake(group.id, bet.id, yes.id, a.id, 10);
    await stake(group.id, bet.id, no.id, b.id, 10);

    await resolveBet(bet.id, yes.id);

    const loser = await prisma.wager.findFirstOrThrow({
      where: { betId: bet.id, userId: b.id },
    });
    expect(loser.payout).toBe(0);
  });

  it("is idempotent — settling twice does not pay out twice", async () => {
    const { users, group, bet, yes, no } = await scenario();
    const [a, b] = users;

    await stake(group.id, bet.id, yes.id, a.id, 50);
    await stake(group.id, bet.id, no.id, b.id, 50);

    await resolveBet(bet.id, yes.id);
    const afterFirst = await tokensOf(group.id, a.id);

    await resolveBet(bet.id, yes.id);
    expect(await tokensOf(group.id, a.id)).toBe(afterFirst);
  });

  it("ignores an unknown bet id", async () => {
    await expect(resolveBet("does-not-exist", null)).resolves.toBeUndefined();
  });

  it("logs the settlement to the group activity feed", async () => {
    const { users, group, bet, yes, no } = await scenario();
    const [a, b] = users;

    await stake(group.id, bet.id, yes.id, a.id, 10);
    await stake(group.id, bet.id, no.id, b.id, 10);
    await resolveBet(bet.id, yes.id);

    const activities = await prisma.activity.findMany({
      where: { groupId: group.id },
    });
    expect(activities.some((a) => a.message.includes("résolu"))).toBe(true);
  });
});
