import Link from "next/link";
import { Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { loadGroupContext } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { EmptyState, KarmaBadge, TokenBadge } from "@/components/ui-patterns";
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

export default async function GroupLeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { groupId } = await params;
  const { user } = await loadGroupContext(groupId);
  const { category } = await searchParams;

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  const activeCategory = categories.find((c) => c.slug === category) ?? null;

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  // Filtering by category means ranking on karma earned in that category only,
  // which the running `karma` counter can't answer — sum the completions.
  let rows: {
    userId: string;
    name: string | null;
    image: string | null;
    karma: number;
    tokens: number;
  }[];

  if (activeCategory) {
    const completions = await prisma.completion.groupBy({
      by: ["userId"],
      where: {
        status: "VALIDATED",
        achievement: {
          groupId,
          deletedAt: null,
          categoryId: activeCategory.id,
        },
      },
      _sum: { awardedPoints: true },
    });

    const byUser = new Map(
      completions.map((c) => [c.userId, c._sum.awardedPoints ?? 0]),
    );

    rows = members.map((member) => ({
      userId: member.userId,
      name: member.user.name,
      image: member.user.image,
      karma: byUser.get(member.userId) ?? 0,
      tokens: member.tokens,
    }));
  } else {
    rows = members.map((member) => ({
      userId: member.userId,
      name: member.user.name,
      image: member.user.image,
      karma: member.karma,
      tokens: member.tokens,
    }));
  }

  rows.sort((a, b) => b.karma - a.karma);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={Trophy}
        title="Classement"
        description={
          activeCategory
            ? `Karma gagné en « ${activeCategory.name} »`
            : "Karma cumulé dans ce groupe"
        }
      />

      {categories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <CategoryChip
            href={`/g/${groupId}/leaderboard`}
            label="Tout"
            active={!activeCategory}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              href={`/g/${groupId}/leaderboard?category=${c.slug}`}
              label={c.name}
              active={activeCategory?.id === c.id}
            />
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title="Aucun membre dans ce groupe" />
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
                <TableHead className="text-right font-normal text-[var(--text-muted)]">
                  Karma
                </TableHead>
                <TableHead className="hidden text-right font-normal text-[var(--text-muted)] sm:table-cell">
                  Tokens
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow
                  key={row.userId}
                  className={cn(row.userId === user.id && "bg-[var(--bg-primary)]/60")}
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
                  <TableCell className="text-right">
                    <KarmaBadge value={row.karma} />
                  </TableCell>
                  <TableCell className="hidden text-right sm:table-cell">
                    <TokenBadge value={row.tokens} />
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

function CategoryChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-white"
          : "border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]",
      )}
    >
      {label}
    </Link>
  );
}
