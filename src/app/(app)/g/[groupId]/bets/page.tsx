import { Coins } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { loadGroupContext } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { EmptyState, TokenBadge } from "@/components/ui-patterns";
import { BetListCard } from "./bet-list-card";
import type { BetStatus } from "@/lib/domain";

export default async function BetsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { user, membership } = await loadGroupContext(groupId);

  const bets = await prisma.bet.findMany({
    where: { achievement: { groupId, deletedAt: null } },
    include: {
      achievement: { select: { id: true, title: true, deadline: true } },
      outcomes: true,
      wagers: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        icon={Coins}
        title="Paris"
        description="Mise tes tokens sur les défis du groupe."
        action={
          <div className="text-right">
            <p className="text-[11px] text-[var(--text-muted)]">Mon solde</p>
            <TokenBadge value={membership.tokens} />
          </div>
        }
      />

      {bets.length === 0 ? (
        <EmptyState
          title="Aucun pari pour l'instant"
          description="Les paris s'ouvrent depuis la page d'un achievement en cours."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {bets.map((bet) => {
            const pot = bet.wagers.reduce((sum, w) => sum + w.amount, 0);
            const myWager = bet.wagers.find((w) => w.userId === user.id);
            const winning = bet.outcomes.find(
              (o) => o.id === bet.winningOutcomeId,
            );

            return (
              <BetListCard
                key={bet.id}
                groupId={groupId}
                bet={{
                  id: bet.id,
                  status: bet.status as BetStatus,
                  type: bet.type,
                  achievement: bet.achievement,
                  pot,
                  wagerCount: bet.wagers.length,
                  winningLabel: winning?.label ?? null,
                  myWager: myWager
                    ? { amount: myWager.amount, payout: myWager.payout }
                    : null,
                  outcomes: bet.outcomes.map((outcome) => ({
                    id: outcome.id,
                    label: outcome.label,
                    staked: bet.wagers
                      .filter((w) => w.outcomeId === outcome.id)
                      .reduce((sum, w) => sum + w.amount, 0),
                  })),
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
