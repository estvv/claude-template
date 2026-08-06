import { notFound } from "next/navigation";
import { Clock, Target, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { loadGroupContext } from "@/lib/session";
import { relativeTime, formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BackLink } from "@/components/page-header";
import { EstimationVotePanel } from "./estimation-vote-panel";
import { SubmitCompletionPanel } from "./submit-completion-panel";
import { CompletionList } from "./completion-list";
import { MessageThread } from "./message-thread";
import { BetPanel } from "./bet-panel";
import { AchievementActions } from "./achievement-actions";

export default async function AchievementDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; achievementId: string }>;
}) {
  const { groupId, achievementId } = await params;
  const { user, group, isOwner, membership } = await loadGroupContext(groupId);

  const achievement = await prisma.achievement.findFirst({
    where: { id: achievementId, groupId, deletedAt: null },
    include: {
      category: true,
      creator: { select: { id: true, name: true } },
      targetUser: { select: { id: true, name: true } },
      estimationVotes: true,
      completions: {
        include: {
          user: { select: { id: true, name: true, image: true } },
          votes: true,
        },
        orderBy: { submittedAt: "asc" },
      },
      messages: {
        where: { deletedAt: null },
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
      bet: {
        include: {
          outcomes: {
            include: { candidate: { select: { id: true, name: true } } },
          },
          wagers: true,
        },
      },
    },
  });

  if (!achievement) notFound();

  const isPersonal = achievement.mode === "PERSONAL";
  const canSubmit =
    achievement.status === "ACTIVE" &&
    (!isPersonal || achievement.targetUserId === user.id);

  const myVote = achievement.estimationVotes.find((v) => v.userId === user.id);

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <BackLink href={`/g/${groupId}/achievements`} />
      </div>
      <Card className="mb-4 gap-0 border-[var(--border-light)] p-5 shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-muted)]">
              {achievement.category.name}
            </p>
            <h1 className="mt-0.5 text-xl font-bold lg:text-2xl">
              {achievement.title}
            </h1>
          </div>
          <AchievementActions
            groupId={groupId}
            achievementId={achievement.id}
            canDelete={
              user.id === achievement.creatorId ||
              isOwner ||
              user.isPlatformAdmin
            }
          />
        </div>

        {achievement.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
            {achievement.description}
          </p>
        )}

        <Separator className="my-4" />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            {isPersonal ? <User size={14} /> : <Target size={14} />}
            {isPersonal
              ? `Défi de ${achievement.targetUser?.name ?? "—"}`
              : "Compétition ouverte"}
          </span>
          {achievement.basePoints !== null && (
            <span className="font-medium text-[var(--color-karma)]">
              {achievement.basePoints} karma
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {achievement.status === "RESOLVED"
              ? `clos le ${formatDateTime(achievement.deadline)}`
              : `échéance ${relativeTime(achievement.deadline)}`}
          </span>
          <span className="ml-auto">
            par {achievement.creator.name ?? "un membre"}
          </span>
        </div>
      </Card>

      {achievement.status === "ESTIMATING" && (
        <EstimationVotePanel
          groupId={groupId}
          achievementId={achievement.id}
          voteCount={achievement.estimationVotes.length}
          myPoints={myVote?.points ?? null}
          closesAt={achievement.estimationClosesAt}
        />
      )}

      {achievement.bet && (
        <BetPanel
          groupId={groupId}
          myTokens={membership.tokens}
          bet={{
            id: achievement.bet.id,
            type: achievement.bet.type,
            status: achievement.bet.status,
            winningOutcomeId: achievement.bet.winningOutcomeId,
            outcomes: achievement.bet.outcomes.map((outcome) => ({
              id: outcome.id,
              label: outcome.label,
              candidateName: outcome.candidate?.name ?? null,
              staked: achievement.bet!.wagers
                .filter((w) => w.outcomeId === outcome.id)
                .reduce((s, w) => s + w.amount, 0),
            })),
            myWager:
              achievement.bet.wagers.find((w) => w.userId === user.id) ?? null,
            pot: achievement.bet.wagers.reduce((s, w) => s + w.amount, 0),
          }}
        />
      )}

      {!achievement.bet && achievement.status === "ACTIVE" && (
        <BetPanel
          groupId={groupId}
          myTokens={membership.tokens}
          bet={null}
          createFor={{
            achievementId: achievement.id,
            mode: achievement.mode,
            candidates: members.map((m) => ({
              id: m.user.id,
              name: m.user.name ?? "Membre",
            })),
            targetName: achievement.targetUser?.name ?? null,
          }}
        />
      )}

      {canSubmit && (
        <SubmitCompletionPanel
          groupId={groupId}
          achievementId={achievement.id}
          alreadySubmitted={achievement.completions.some(
            (c) => c.userId === user.id && c.status !== "REJECTED",
          )}
        />
      )}

      <CompletionList
        groupId={groupId}
        currentUserId={user.id}
        canCloseEarly={isOwner || user.isPlatformAdmin}
        basePoints={achievement.basePoints}
        completions={achievement.completions.map((completion) => ({
          id: completion.id,
          status: completion.status,
          proofUrl: completion.proofUrl,
          note: completion.note,
          rank: completion.rank,
          awardedPoints: completion.awardedPoints,
          voteClosesAt: completion.voteClosesAt,
          submittedAt: completion.submittedAt,
          user: completion.user,
          myVote:
            completion.votes.find((v) => v.userId === user.id) ?? null,
          voteCount: completion.votes.length,
        }))}
      />

      <MessageThread
        groupId={groupId}
        achievementId={achievement.id}
        currentUserId={user.id}
        groupOwnerId={group.ownerId}
        isPlatformAdmin={user.isPlatformAdmin}
        messages={achievement.messages}
      />
    </div>
  );
}
