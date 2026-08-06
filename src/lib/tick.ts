import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { resolveBet } from "@/lib/bets";
import {
  DEFAULT_POINTS,
  INACTIVITY_REMINDER_DAYS,
  pointsForRank,
} from "@/lib/constants";

/**
 * Time-driven state transitions (vote windows closing, deadlines lapsing) are
 * applied lazily whenever a group page is loaded, rather than by a scheduler.
 * A self-hosted app for a group of friends doesn't warrant a cron process, and
 * nothing here needs to happen at a precise instant — only before someone
 * looks at it.
 */
export async function runGroupTick(groupId: string) {
  const now = new Date();
  await closeEstimationVotes(groupId, now);
  await closeValidationVotes(groupId, now);
  await expireAchievements(groupId, now);
  await settleExpiredBets(groupId);
  await nudgeInactiveMembers(groupId, now);
}

/** Member-created achievements get their point value from a community vote. */
async function closeEstimationVotes(groupId: string, now: Date) {
  const due = await prisma.achievement.findMany({
    where: {
      groupId,
      status: "ESTIMATING",
      estimationClosesAt: { lte: now },
      deletedAt: null,
    },
    include: { estimationVotes: true },
  });

  for (const achievement of due) {
    const votes = achievement.estimationVotes;
    const points = votes.length
      ? Math.round(votes.reduce((s, v) => s + v.points, 0) / votes.length)
      : DEFAULT_POINTS;

    await prisma.achievement.update({
      where: { id: achievement.id },
      data: { status: "ACTIVE", basePoints: points, estimationClosesAt: null },
    });

    await logActivity(
      groupId,
      `« ${achievement.title} » est estimé à ${points} karma et démarre.`,
    );
  }
}

async function closeValidationVotes(groupId: string, now: Date) {
  const due = await prisma.completion.findMany({
    where: {
      status: "PENDING",
      voteClosesAt: { lte: now },
      achievement: { groupId, deletedAt: null },
    },
    select: { id: true },
  });

  for (const { id } of due) {
    await resolveCompletion(id);
  }
}

/**
 * Tallies a completion's validation vote and applies the outcome: karma for the
 * submitter, ranking for OPEN achievements, and bet settlement.
 *
 * Majority is computed over the members who actually voted, not the whole
 * group. With no votes at all nobody objected, so it passes at face value.
 */
export async function resolveCompletion(completionId: string) {
  const completion = await prisma.completion.findUnique({
    where: { id: completionId },
    include: {
      votes: true,
      user: { select: { name: true } },
      achievement: {
        include: { bet: { include: { outcomes: true } } },
      },
    },
  });

  if (!completion || completion.status !== "PENDING") return;

  const { achievement } = completion;
  const basePoints = achievement.basePoints ?? DEFAULT_POINTS;
  const votes = completion.votes;

  const rejects = votes.filter((v) => v.decision === "REJECT");
  const approvals = votes.filter((v) => v.decision === "VALIDATE");

  if (votes.length > 0 && rejects.length > votes.length / 2) {
    await prisma.completion.update({
      where: { id: completion.id },
      data: { status: "REJECTED", resolvedAt: new Date() },
    });
    await logActivity(
      achievement.groupId,
      `La preuve de ${completion.user.name ?? "un membre"} pour « ${achievement.title} » a été rejetée.`,
    );
    return;
  }

  // "More than half voted 0" is an explicit outcome — the achievement still
  // counts as done, it just isn't worth anything.
  const zeroVotes = approvals.filter((v) => (v.points ?? 0) === 0);
  const votedPoints =
    approvals.length === 0
      ? basePoints
      : zeroVotes.length > approvals.length / 2
        ? 0
        : Math.round(
            approvals.reduce((s, v) => s + (v.points ?? 0), 0) /
              approvals.length,
          );

  const previouslyValidated = await prisma.completion.count({
    where: { achievementId: achievement.id, status: "VALIDATED" },
  });
  const rank = previouslyValidated + 1;

  // Only OPEN achievements are a race; a personal challenge is binary.
  const awardedPoints =
    achievement.mode === "OPEN" ? pointsForRank(votedPoints, rank) : votedPoints;

  await prisma.$transaction(async (tx) => {
    await tx.completion.update({
      where: { id: completion.id },
      data: {
        status: "VALIDATED",
        awardedPoints,
        rank,
        resolvedAt: new Date(),
      },
    });

    if (awardedPoints > 0) {
      await tx.groupMember.update({
        where: {
          groupId_userId: {
            groupId: achievement.groupId,
            userId: completion.userId,
          },
        },
        data: { karma: { increment: awardedPoints } },
      });
    }

    // A personal challenge is settled the moment it succeeds.
    if (achievement.mode === "PERSONAL") {
      await tx.achievement.update({
        where: { id: achievement.id },
        data: { status: "RESOLVED" },
      });
    }
  });

  await logActivity(
    achievement.groupId,
    `${completion.user.name ?? "Un membre"} a validé « ${achievement.title} »` +
      (achievement.mode === "OPEN" ? ` (${rank}e)` : "") +
      ` et gagne ${awardedPoints} karma.`,
  );

  // A first validation is decisive for both bet types: a personal challenge is
  // now a success, and an open race has its winner.
  const bet = achievement.bet;
  if (bet && bet.status === "OPEN") {
    if (achievement.mode === "PERSONAL") {
      const yes = bet.outcomes.find((o) => o.label === "Oui");
      await resolveBet(bet.id, yes?.id ?? null);
    } else if (rank === 1) {
      const winner = bet.outcomes.find(
        (o) => o.candidateId === completion.userId,
      );
      await resolveBet(bet.id, winner?.id ?? null);
    } else {
      // Not decisive on its own, but it may have been the last proof the
      // expired achievement was waiting on.
      await settleBetIfReady(achievement.id);
    }
  }
}

/**
 * Settles the bet of an achievement whose deadline has passed.
 *
 * A proof submitted just before the deadline still has its full validation
 * window, so the bet has to wait for it: resolving at the deadline would pay
 * out "failed" on a challenge that is about to be validated, contradicting the
 * karma the same proof is about to award.
 */
async function settleBetIfReady(achievementId: string) {
  const achievement = await prisma.achievement.findUnique({
    where: { id: achievementId },
    include: {
      bet: { include: { outcomes: true } },
      completions: { select: { status: true, rank: true, userId: true } },
    },
  });

  const bet = achievement?.bet;
  if (!achievement || !bet || bet.status !== "OPEN") return;
  // Deadline not reached yet: a decisive validation may still happen.
  if (achievement.deadline.getTime() > Date.now()) return;
  // Still judging a proof that was submitted in time — wait for the verdict.
  if (achievement.completions.some((c) => c.status === "PENDING")) return;

  if (achievement.mode === "PERSONAL") {
    const succeeded = achievement.completions.some(
      (c) => c.status === "VALIDATED",
    );
    const outcome = bet.outcomes.find((o) =>
      succeeded ? o.label === "Oui" : o.label === "Non",
    );
    await resolveBet(bet.id, outcome?.id ?? null);
    return;
  }

  const winner = achievement.completions.find(
    (c) => c.status === "VALIDATED" && c.rank === 1,
  );
  const outcome = winner
    ? bet.outcomes.find((o) => o.candidateId === winner.userId)
    : null;
  await resolveBet(bet.id, outcome?.id ?? null);
}

/** Deadline reached: the achievement closes; its bet settles once nothing is
 *  left pending (see `settleBetIfReady`). */
async function expireAchievements(groupId: string, now: Date) {
  const due = await prisma.achievement.findMany({
    where: {
      groupId,
      status: "ACTIVE",
      deadline: { lte: now },
      deletedAt: null,
    },
    select: { id: true, title: true },
  });

  for (const achievement of due) {
    await prisma.achievement.update({
      where: { id: achievement.id },
      data: { status: "RESOLVED" },
    });

    await settleBetIfReady(achievement.id);

    await logActivity(
      groupId,
      `Le délai de « ${achievement.title} » est écoulé.`,
    );
  }
}

/**
 * Calls out members who haven't landed an achievement in a while. `joinedAt`
 * acts as the starting point for someone who never validated anything, so a
 * brand-new member isn't nudged on day one.
 */
async function nudgeInactiveMembers(groupId: string, now: Date) {
  const threshold = new Date(
    now.getTime() - INACTIVITY_REMINDER_DAYS * 24 * 60 * 60 * 1000,
  );

  const candidates = await prisma.groupMember.findMany({
    where: {
      groupId,
      joinedAt: { lte: threshold },
      // Never nudged, or not since the last period.
      OR: [
        { lastInactivityNudgeAt: null },
        { lastInactivityNudgeAt: { lte: threshold } },
      ],
    },
    include: { user: { select: { id: true, name: true } } },
  });

  for (const member of candidates) {
    const lastWin = await prisma.completion.findFirst({
      where: {
        userId: member.userId,
        status: "VALIDATED",
        achievement: { groupId },
      },
      orderBy: { resolvedAt: "desc" },
      select: { resolvedAt: true },
    });

    const lastActivity = lastWin?.resolvedAt ?? member.joinedAt;
    if (lastActivity > threshold) continue;

    await prisma.groupMember.update({
      where: { id: member.id },
      data: { lastInactivityNudgeAt: now },
    });

    await logActivity(
      groupId,
      `${member.user.name ?? "Un membre"} n'a rien validé depuis ${INACTIVITY_REMINDER_DAYS} jours. 👀`,
    );
  }
}

/**
 * Catches bets left open because a validation was still running when the
 * deadline passed and no later tick happened to touch them.
 */
async function settleExpiredBets(groupId: string) {
  const stale = await prisma.bet.findMany({
    where: {
      status: "OPEN",
      achievement: {
        groupId,
        status: "RESOLVED",
        deletedAt: null,
        completions: { none: { status: "PENDING" } },
      },
    },
    select: { achievementId: true },
  });

  for (const { achievementId } of stale) {
    await settleBetIfReady(achievementId);
  }
}
