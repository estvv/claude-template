import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

/**
 * Pari-mutuel settlement. Stakes were already debited when the wager was
 * placed, so resolution only ever credits: winners share the whole pot in
 * proportion to their stake, losers get nothing.
 *
 * With nobody on the winning side there is no one to share the pot, so every
 * stake is handed back instead (see docs/FEATURES.md).
 */
export async function resolveBet(betId: string, winningOutcomeId: string | null) {
  const bet = await prisma.bet.findUnique({
    where: { id: betId },
    include: {
      wagers: true,
      achievement: { select: { groupId: true, title: true } },
    },
  });

  if (!bet || bet.status !== "OPEN") return;

  const winners = winningOutcomeId
    ? bet.wagers.filter((w) => w.outcomeId === winningOutcomeId)
    : [];

  const refund = winners.length === 0;
  const pot = bet.wagers.reduce((sum, w) => sum + w.amount, 0);
  const stakedOnWinner = winners.reduce((sum, w) => sum + w.amount, 0);

  // Floor each share, then hand the rounding remainder to the biggest stake so
  // the pot is conserved exactly rather than leaking tokens out of the group.
  const payouts = new Map<string, number>();
  if (refund) {
    for (const wager of bet.wagers) payouts.set(wager.id, wager.amount);
  } else {
    let distributed = 0;
    for (const wager of winners) {
      const share = Math.floor((wager.amount / stakedOnWinner) * pot);
      payouts.set(wager.id, share);
      distributed += share;
    }
    const remainder = pot - distributed;
    if (remainder > 0) {
      const biggest = [...winners].sort((a, b) => b.amount - a.amount)[0];
      payouts.set(biggest.id, (payouts.get(biggest.id) ?? 0) + remainder);
    }
    for (const wager of bet.wagers) {
      if (!payouts.has(wager.id)) payouts.set(wager.id, 0);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const wager of bet.wagers) {
      const payout = payouts.get(wager.id) ?? 0;
      await tx.wager.update({ where: { id: wager.id }, data: { payout } });
      if (payout > 0) {
        await tx.groupMember.update({
          where: {
            groupId_userId: {
              groupId: bet.achievement.groupId,
              userId: wager.userId,
            },
          },
          data: { tokens: { increment: payout } },
        });
      }
    }

    await tx.bet.update({
      where: { id: bet.id },
      data: {
        status: refund ? "REFUNDED" : "RESOLVED",
        winningOutcomeId: refund ? null : winningOutcomeId,
        resolvedAt: new Date(),
      },
    });
  });

  await logActivity(
    bet.achievement.groupId,
    refund
      ? `Pari sur « ${bet.achievement.title} » annulé : personne n'avait misé sur la bonne issue, les mises sont remboursées.`
      : `Pari sur « ${bet.achievement.title} » résolu : ${pot} tokens partagés entre ${winners.length} gagnant(s).`,
  );
}
