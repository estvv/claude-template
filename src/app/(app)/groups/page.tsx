import Link from "next/link";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PageHero } from "@/components/page-header";
import { EmptyState, KarmaBadge, TokenBadge } from "@/components/ui-patterns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { JoinGroupDialog } from "./join-group-dialog";

export default async function GroupsPage() {
  const user = await requireUser();

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: {
      group: {
        include: {
          _count: { select: { members: true, achievements: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const hasGroups = memberships.length > 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHero
        prefix="Salut,"
        highlight={user.name ?? "toi"}
        description=""
        action={
          hasGroups ? (
            <div className="hidden items-center gap-2 lg:flex">
              <JoinGroupDialog />
              <Button asChild>
                <Link href="/groups/new">Créer un groupe</Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      {!hasGroups ? (
        <EmptyState
          title="Tu n'es dans aucun groupe pour l'instant"
          description="Crée ton propre groupe, ou rejoins celui d'un pote avec son code d'invitation."
          action={
            <div className="flex items-center justify-center gap-2">
              <JoinGroupDialog />
              <Button asChild>
                <Link href="/groups/new">Créer un groupe</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {memberships.map(({ group, karma, tokens }) => (
            <Link key={group.id} href={`/g/${group.id}`}>
              <Card className="h-full gap-0 border-[var(--border-light)] p-4 shadow-none transition-colors hover:bg-[var(--sidebar-hover)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{group.name}</p>
                    {group.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">
                        {group.description}
                      </p>
                    )}
                  </div>
                  {group.ownerId === user.id && (
                    <span className="shrink-0 rounded-sm border border-[var(--border-light)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)] shadow-sm">
                      OWNER
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <KarmaBadge value={karma} />
                  <TokenBadge value={tokens} />
                  <span className="ml-auto flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <Users size={13} />
                    {group._count.members}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {hasGroups && (
        <div className="mt-8 flex flex-col gap-2 lg:hidden">
          <Button asChild className="w-full">
            <Link href="/groups/new">Créer un groupe</Link>
          </Button>
          <JoinGroupDialog className="w-full" />
        </div>
      )}
    </div>
  );
}
