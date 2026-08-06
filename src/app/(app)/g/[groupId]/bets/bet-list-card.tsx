import Link from "next/link";
import { Coins } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BetStatus } from "@/lib/domain";

const STATUS_LABELS: Record<BetStatus, string> = {
  OPEN: "Ouvert",
  RESOLVED: "Résolu",
  REFUNDED: "Remboursé",
};

const STATUS_STYLES: Record<BetStatus, string> = {
  OPEN: "border-[var(--color-token)]/30 bg-[var(--color-token-light)] text-[var(--color-token)]",
  RESOLVED:
    "border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-muted)]",
  REFUNDED:
    "border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-muted)]",
};

// Pari-mutuel stake bar segments — reuses the app's chart palette so the
// betting page gets its own visual signature without inventing new colors.
const STAKE_COLORS = [
  "var(--chart-4)",
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-5)",
];

export type BetListCardData = {
  id: string;
  status: BetStatus;
  type: string;
  achievement: { id: string; title: string; deadline: Date };
  outcomes: { id: string; label: string; staked: number }[];
  pot: number;
  wagerCount: number;
  winningLabel: string | null;
  myWager: { amount: number; payout: number | null } | null;
};

export function BetListCard({
  groupId,
  bet,
}: {
  groupId: string;
  bet: BetListCardData;
}) {
  const sortedOutcomes = [...bet.outcomes].sort((a, b) => b.staked - a.staked);
  const topOutcomes = sortedOutcomes.slice(0, 3);
  const hiddenCount = sortedOutcomes.length - topOutcomes.length;

  return (
    <Link href={`/g/${groupId}/achievements/${bet.achievement.id}`}>
      <Card className="gap-0 overflow-hidden border-[var(--border-light)] p-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-light)] bg-[var(--color-token-light)]/40 px-5 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {bet.achievement.title}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {bet.type === "YES_NO"
                ? "Va-t-il réussir ?"
                : "Qui finira premier ?"}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold",
              STATUS_STYLES[bet.status],
            )}
          >
            {STATUS_LABELS[bet.status]}
          </span>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-medium tracking-wide text-[var(--text-muted)] uppercase">
                Pot
              </p>
              <p className="flex items-center gap-1.5 text-2xl font-bold text-[var(--color-token)]">
                <Coins size={18} />
                {bet.pot}
              </p>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {bet.wagerCount} parieur{bet.wagerCount > 1 ? "s" : ""}
            </p>
          </div>

          {bet.pot > 0 && (
            <div className="flex h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]">
              {sortedOutcomes
                .filter((outcome) => outcome.staked > 0)
                .map((outcome, index) => (
                  <span
                    key={outcome.id}
                    style={{
                      width: `${(outcome.staked / bet.pot) * 100}%`,
                      backgroundColor: STAKE_COLORS[index % STAKE_COLORS.length],
                    }}
                  />
                ))}
            </div>
          )}

          <ul className="space-y-1">
            {topOutcomes.map((outcome, index) => (
              <li
                key={outcome.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate text-[var(--text-secondary)]">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        STAKE_COLORS[index % STAKE_COLORS.length],
                    }}
                  />
                  <span className="truncate">{outcome.label}</span>
                </span>
                <span className="shrink-0 font-medium">{outcome.staked}</span>
              </li>
            ))}
            {hiddenCount > 0 && (
              <li className="text-xs text-[var(--text-muted)]">
                +{hiddenCount} autre{hiddenCount > 1 ? "s" : ""}
              </li>
            )}
          </ul>

          <div className="flex items-center justify-between gap-2 border-t border-dashed border-[var(--border-light)] pt-3 text-xs">
            {bet.winningLabel ? (
              <span className="font-medium text-[var(--color-green)]">
                Gagnant : {bet.winningLabel}
              </span>
            ) : bet.myWager ? (
              <span className="font-medium text-[var(--color-token)]">
                Ta mise : {bet.myWager.amount}
                {bet.myWager.payout !== null && ` → ${bet.myWager.payout}`}
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">
                Pas encore de mise de ta part
              </span>
            )}

            {bet.status === "OPEN" && (
              <span className="shrink-0 text-[var(--text-muted)]">
                clôture {relativeTime(bet.achievement.deadline)}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
