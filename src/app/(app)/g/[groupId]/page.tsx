import Link from "next/link";
import { Coins, Target, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { loadGroupContext } from "@/lib/session";
import { relativeTime } from "@/lib/format";
import { PageHero } from "@/components/page-header";
import { EmptyState, StatCard } from "@/components/ui-patterns";
import { AchievementCard } from "@/components/achievement-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function GroupHomePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { user, group, membership } = await loadGroupContext(groupId);

  const [ranking, ongoing, pendingVotes] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
      orderBy: [{ karma: "desc" }, { joinedAt: "asc" }],
    }),
    prisma.achievement.findMany({
      where: { groupId, deletedAt: null, status: { in: ["ESTIMATING", "ACTIVE"] } },
      include: {
        category: { select: { name: true } },
        targetUser: { select: { name: true } },
        bet: { select: { id: true } },
        _count: { select: { completions: true } },
      },
      orderBy: { deadline: "asc" },
      take: 4,
    }),
    // Proofs from other members that this member hasn't judged yet.
    prisma.completion.findMany({
      where: {
        status: "PENDING",
        userId: { not: user.id },
        achievement: { groupId, deletedAt: null },
        votes: { none: { userId: user.id } },
      },
      include: {
        user: { select: { name: true } },
        achievement: { select: { id: true, title: true } },
      },
      orderBy: { voteClosesAt: "asc" },
    }),
  ]);

  const position = ranking.findIndex((m) => m.userId === user.id) + 1;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHero
        prefix="Salut,"
        highlight={user.name ?? "toi"}
        description={group.name}
        action={
          <Button asChild className="hidden lg:inline-flex">
            <Link href={`/g/${groupId}/achievements/new`}>
              Nouvel achievement
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Trophy} label="Mon karma" value={membership.karma} />
        <StatCard icon={Coins} label="Mes tokens" value={membership.tokens} />
        <StatCard
          icon={Trophy}
          label="Ma position"
          value={`${position}e`}
          hint={`sur ${ranking.length} membres`}
        />
        <StatCard icon={Target} label="En cours" value={ongoing.length} />
      </div>

      {pendingVotes.length > 0 && (
        <Card className="mt-6 gap-0 border-[var(--color-blue)]/30 bg-[var(--color-blue-light)]/40 p-5 shadow-none">
          <p className="text-sm font-semibold">
            {pendingVotes.length} preuve(s) attendent ton vote
          </p>
          <ul className="mt-3 space-y-2">
            {pendingVotes.map((completion) => (
              <li key={completion.id}>
                <Link
                  href={`/g/${groupId}/achievements/${completion.achievement.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm transition-colors hover:bg-[var(--sidebar-hover)]"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">
                      {completion.user.name ?? "Un membre"}
                    </span>{" "}
                    — {completion.achievement.title}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                    {relativeTime(completion.voteClosesAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Achievements en cours</h2>
          <Link
            href={`/g/${groupId}/achievements`}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Tout voir
          </Link>
        </div>

        {ongoing.length === 0 ? (
          <EmptyState
            title="Rien en cours"
            description="Lance un défi pour animer le groupe."
            action={
              <Button asChild>
                <Link href={`/g/${groupId}/achievements/new`}>
                  Créer un achievement
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {ongoing.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                groupId={groupId}
                achievement={{
                  ...achievement,
                  hasBet: achievement.bet !== null,
                  completionCount: achievement._count.completions,
                }}
              />
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 lg:hidden">
        <Button asChild className="w-full">
          <Link href={`/g/${groupId}/achievements/new`}>
            Nouvel achievement
          </Link>
        </Button>
      </div>
    </div>
  );
}
