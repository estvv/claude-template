"use client";

import { useState, useTransition } from "react";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { createBet, placeWager } from "../../bets/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TokenBadge } from "@/components/ui-patterns";
import { cn } from "@/lib/utils";
import type { BetStatus } from "@/lib/domain";

type Outcome = {
  id: string;
  label: string;
  candidateName: string | null;
  staked: number;
};

type Bet = {
  id: string;
  type: string;
  status: string;
  winningOutcomeId: string | null;
  outcomes: Outcome[];
  myWager: { outcomeId: string; amount: number; payout: number | null } | null;
  pot: number;
};

type CreateFor = {
  achievementId: string;
  mode: string;
  candidates: { id: string; name: string }[];
  targetName: string | null;
};

export function BetPanel({
  groupId,
  myTokens,
  bet,
  createFor,
}: {
  groupId: string;
  myTokens: number;
  bet: Bet | null;
  createFor?: CreateFor;
}) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("10");
  const [selected, setSelected] = useState<string | null>(null);

  if (!bet && createFor) {
    return (
      <Card className="mb-4 gap-0 border-dashed border-[var(--border-light)] bg-[var(--bg-primary)]/40 p-5 shadow-none">
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-[var(--color-token)]" />
          <p className="text-sm font-semibold">Aucun pari sur cet achievement</p>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {createFor.mode === "PERSONAL"
            ? `Ouvre un pari : ${createFor.targetName ?? "la personne visée"} va-t-elle réussir ?`
            : "Ouvre un pari : qui finira en premier ?"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full sm:w-auto"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await createBet(groupId, createFor.achievementId);
              if (result?.error) toast.error(result.error);
              else toast.success("Pari ouvert");
            })
          }
        >
          Ouvrir un pari
        </Button>
      </Card>
    );
  }

  if (!bet) return null;

  const status = bet.status as BetStatus;
  const isOpen = status === "OPEN";
  const canBet = isOpen && !bet.myWager && myTokens > 0;

  return (
    <Card className="mb-4 gap-0 border-[var(--color-token)]/30 bg-[var(--color-token-light)]/40 p-5 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-[var(--color-token)]" />
          <p className="text-sm font-semibold">
            {bet.type === "YES_NO" ? "Va-t-il réussir ?" : "Qui finira premier ?"}
          </p>
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          Pot : <TokenBadge value={bet.pot} className="text-xs" />
        </span>
      </div>

      {status === "REFUNDED" && (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Personne n&apos;avait misé sur la bonne issue — toutes les mises ont
          été remboursées.
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {bet.outcomes
          .filter((outcome) => isOpen || outcome.staked > 0 || outcome.id === bet.winningOutcomeId)
          .map((outcome) => {
            const isMine = bet.myWager?.outcomeId === outcome.id;
            const won = bet.winningOutcomeId === outcome.id;
            const share =
              bet.pot > 0 ? Math.round((outcome.staked / bet.pot) * 100) : 0;

            return (
              <li key={outcome.id}>
                <button
                  type="button"
                  disabled={!canBet}
                  onClick={() => setSelected(outcome.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border bg-white px-3 py-2 text-left transition-colors",
                    canBet && "hover:border-[var(--color-token)]",
                    selected === outcome.id
                      ? "border-[var(--color-token)]"
                      : "border-[var(--border-light)]",
                    won && "border-[var(--color-green)] bg-[var(--color-green-light)]",
                    !canBet && "cursor-default",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {outcome.label}
                    {isMine && (
                      <span className="ml-2 text-[10px] font-bold text-[var(--color-token)]">
                        TA MISE
                      </span>
                    )}
                    {won && (
                      <span className="ml-2 text-[10px] font-bold text-[var(--color-green)]">
                        GAGNANT
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                    {outcome.staked} ({share}%)
                  </span>
                </button>
              </li>
            );
          })}
      </ul>

      {canBet && (
        <div className="mt-3 flex gap-2">
          <Input
            type="number"
            min={1}
            max={myTokens}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-28 bg-white"
            aria-label="Mise"
          />
          <Button
            type="button"
            disabled={pending || !selected}
            onClick={() =>
              startTransition(async () => {
                if (!selected) return;
                const result = await placeWager(
                  groupId,
                  bet.id,
                  selected,
                  Number(amount),
                );
                if (result?.error) toast.error(result.error);
                else toast.success("Mise enregistrée");
              })
            }
          >
            Miser
          </Button>
          <span className="self-center text-xs text-[var(--text-muted)]">
            solde : {myTokens}
          </span>
        </div>
      )}

      {bet.myWager && (
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          Tu as misé {bet.myWager.amount} tokens.
          {bet.myWager.payout !== null &&
            (bet.myWager.payout > 0
              ? ` Tu as récupéré ${bet.myWager.payout} tokens.`
              : " Tu as tout perdu.")}
        </p>
      )}

      {isOpen && !bet.myWager && myTokens === 0 && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Tu n&apos;as plus de tokens à miser.
        </p>
      )}
    </Card>
  );
}
