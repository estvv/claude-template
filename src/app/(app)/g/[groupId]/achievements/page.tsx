import Link from "next/link";
import { Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { loadGroupContext } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui-patterns";
import { AchievementCard } from "@/components/achievement-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FILTERS = {
  ongoing: { label: "En cours", statuses: ["ESTIMATING", "ACTIVE"] },
  done: { label: "Terminés", statuses: ["RESOLVED"] },
  all: { label: "Tous", statuses: ["ESTIMATING", "ACTIVE", "RESOLVED"] },
} as const;

type Filter = keyof typeof FILTERS;

export default async function AchievementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { groupId } = await params;
  await loadGroupContext(groupId);

  const { filter } = await searchParams;
  const active: Filter = filter && filter in FILTERS ? (filter as Filter) : "ongoing";

  const achievements = await prisma.achievement.findMany({
    where: {
      groupId,
      deletedAt: null,
      status: { in: [...FILTERS[active].statuses] },
    },
    include: {
      category: { select: { name: true } },
      targetUser: { select: { name: true } },
      bet: { select: { id: true } },
      _count: { select: { completions: true } },
    },
    orderBy: [{ status: "asc" }, { deadline: "asc" }],
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Target}
        title="Achievements"
        description="Les défis du groupe, en cours et passés."
        action={
          <Button asChild className="hidden lg:inline-flex">
            <Link href={`/g/${groupId}/achievements/new`}>Nouveau</Link>
          </Button>
        }
      />

      <Tabs value={active} className="mb-4">
        <TabsList>
          {Object.entries(FILTERS).map(([key, { label }]) => (
            <TabsTrigger key={key} value={key} asChild>
              <Link href={`/g/${groupId}/achievements?filter=${key}`}>
                {label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {achievements.length === 0 ? (
        <EmptyState
          title="Aucun achievement ici"
          description="Lance le premier défi du groupe."
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
          {achievements.map((achievement) => (
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

      <div className="mt-6 lg:hidden">
        <Button asChild className="w-full">
          <Link href={`/g/${groupId}/achievements/new`}>
            Créer un achievement
          </Link>
        </Button>
      </div>
    </div>
  );
}
