import { Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { EmptyState, KarmaBadge } from "@/components/ui-patterns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Cross-group ranking: a user's karma summed over every group they belong to.
 * Deliberately not the same number as any single group's leaderboard.
 */
export default async function GlobalLeaderboardPage() {
  const user = await requireUser();

  const memberships = await prisma.groupMember.findMany({
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  const totals = new Map<
    string,
    { name: string | null; image: string | null; karma: number; groups: number }
  >();

  for (const membership of memberships) {
    const current = totals.get(membership.userId) ?? {
      name: membership.user.name,
      image: membership.user.image,
      karma: 0,
      groups: 0,
    };
    current.karma += membership.karma;
    current.groups += 1;
    totals.set(membership.userId, current);
  }

  const rows = [...totals.entries()]
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.karma - a.karma);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={Trophy}
        title="Classement global"
        description=""
      />

      {rows.length === 0 ? (
        <EmptyState title="Personne n'a encore gagné de karma" />
      ) : (
        <Card className="gap-0 overflow-hidden border-[var(--border-light)] p-0 shadow-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 font-normal text-[var(--text-muted)]">
                  #
                </TableHead>
                <TableHead className="font-normal text-[var(--text-muted)]">
                  Membre
                </TableHead>
                <TableHead className="hidden text-right font-normal text-[var(--text-muted)] sm:table-cell">
                  Groupes
                </TableHead>
                <TableHead className="text-right font-normal text-[var(--text-muted)]">
                  Karma
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow
                  key={row.userId}
                  className={cn(
                    row.userId === user.id && "bg-[var(--bg-primary)]/60",
                  )}
                >
                  <TableCell className="text-sm text-[var(--text-muted)]">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7 rounded-lg">
                        <AvatarImage src={row.image ?? undefined} alt="" />
                        <AvatarFallback className="rounded-lg text-[10px]">
                          {(row.name ?? "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm">
                        {row.name ?? "Membre"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right text-sm text-[var(--text-muted)] sm:table-cell">
                    {row.groups}
                  </TableCell>
                  <TableCell className="text-right">
                    <KarmaBadge value={row.karma} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
