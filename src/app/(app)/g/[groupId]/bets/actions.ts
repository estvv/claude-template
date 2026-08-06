"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { betTypeForMode, type AchievementMode } from "@/lib/domain";

export type ActionState = { error: string } | null;

/**
 * Opens the (single) bet attached to an achievement. Its type and its set of
 * outcomes both follow from the achievement's mode — neither is a free choice.
 */
export async function createBet(
  groupId: string,
  achievementId: string,
): Promise<ActionState> {
  const { user } = await requireMembership(groupId);

  const achievement = await prisma.achievement.findFirst({
    where: { id: achievementId, groupId, status: "ACTIVE", deletedAt: null },
    include: { bet: { select: { id: true } } },
  });
  if (!achievement) return { error: "Achievement indisponible." };
  if (achievement.bet) return { error: "Un pari existe déjà." };

  const mode = achievement.mode as AchievementMode;

  const outcomes =
    mode === "PERSONAL"
      ? [{ label: "Oui" }, { label: "Non" }]
      : (
          await prisma.groupMember.findMany({
            where: { groupId },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { joinedAt: "asc" },
          })
        ).map((member) => ({
          label: member.user.name ?? "Membre",
          candidateId: member.user.id,
        }));

  await prisma.bet.create({
    data: {
      achievementId,
      creatorId: user.id,
      type: betTypeForMode(mode),
      outcomes: { create: outcomes },
    },
  });

  await logActivity(
    groupId,
    `${user.name ?? "Un membre"} a ouvert un pari sur « ${achievement.title} ».`,
  );

  revalidatePath(`/g/${groupId}/achievements/${achievementId}`);
  return null;
}

/**
 * Places a stake. Tokens are debited immediately so a member can never commit
 * more than they hold; resolution only ever credits back.
 */
export async function placeWager(
  groupId: string,
  betId: string,
  outcomeId: string,
  amount: number,
): Promise<ActionState> {
  const { user, membership } = await requireMembership(groupId);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Mise invalide." };
  }
  const stake = Math.round(amount);
  if (stake > membership.tokens) {
    return { error: `Tu n'as que ${membership.tokens} tokens.` };
  }

  const bet = await prisma.bet.findFirst({
    where: { id: betId, status: "OPEN", achievement: { groupId } },
    include: {
      outcomes: { select: { id: true } },
      achievement: { select: { id: true, status: true, title: true } },
      wagers: { where: { userId: user.id } },
    },
  });
  if (!bet) return { error: "Ce pari est fermé." };
  if (bet.achievement.status !== "ACTIVE") {
    return { error: "L'achievement n'est plus en cours." };
  }
  if (!bet.outcomes.some((o) => o.id === outcomeId)) {
    return { error: "Issue inconnue." };
  }
  // One position per member: changing sides mid-flight would let people hedge
  // after the fact.
  if (bet.wagers.length > 0) {
    return { error: "Tu as déjà misé sur ce pari." };
  }

  await prisma.$transaction([
    prisma.wager.create({
      data: { betId, outcomeId, userId: user.id, amount: stake },
    }),
    prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId: user.id } },
      data: { tokens: { decrement: stake } },
    }),
  ]);

  revalidatePath(`/g/${groupId}/achievements/${bet.achievement.id}`);
  return null;
}
