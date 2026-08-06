"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Check, Gavel, X } from "lucide-react";
import { toast } from "sonner";
import { closeValidationEarly, voteValidation } from "../actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui-patterns";
import { relativeTime } from "@/lib/format";
import { mediaKind } from "@/lib/upload-types";
import { cn } from "@/lib/utils";
import type { CompletionStatus, ValidationDecision } from "@/lib/domain";

type Completion = {
  id: string;
  status: string;
  proofUrl: string;
  note: string | null;
  rank: number | null;
  awardedPoints: number | null;
  voteClosesAt: Date;
  submittedAt: Date;
  user: { id: string; name: string | null; image: string | null };
  myVote: { decision: string; points: number | null } | null;
  voteCount: number;
};

const STATUS_STYLE: Record<CompletionStatus, string> = {
  PENDING: "text-[var(--color-blue)]",
  VALIDATED: "text-[var(--color-green)]",
  REJECTED: "text-[var(--color-red)]",
};

function ProofMedia({ url }: { url: string }) {
  switch (mediaKind(url)) {
    case "audio":
      return (
        <audio src={url} controls className="w-full px-3 py-4" />
      );
    case "video":
      return (
        <video src={url} controls className="max-h-80 w-full bg-black" />
      );
    default:
      return (
        <Image
          src={url}
          alt="Preuve"
          width={800}
          height={600}
          className="max-h-80 w-full object-contain"
          unoptimized
        />
      );
  }
}

export function CompletionList({
  groupId,
  currentUserId,
  canCloseEarly,
  basePoints,
  completions,
}: {
  groupId: string;
  currentUserId: string;
  canCloseEarly: boolean;
  basePoints: number | null;
  completions: Completion[];
}) {
  return (
    <Card className="mb-4 gap-0 border-[var(--border-light)] p-5 shadow-none">
      <p className="mb-4 text-lg font-semibold">
        Réalisations ({completions.length})
      </p>

      {completions.length === 0 ? (
        <EmptyState
          title="Personne ne l'a encore fait"
          description="Sois le premier à soumettre une preuve."
        />
      ) : (
        <ul className="space-y-4">
          {completions.map((completion) => (
            <CompletionRow
              key={completion.id}
              groupId={groupId}
              currentUserId={currentUserId}
              canCloseEarly={canCloseEarly}
              basePoints={basePoints}
              completion={completion}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function CompletionRow({
  groupId,
  currentUserId,
  canCloseEarly,
  basePoints,
  completion,
}: {
  groupId: string;
  currentUserId: string;
  canCloseEarly: boolean;
  basePoints: number | null;
  completion: Completion;
}) {
  const [points, setPoints] = useState(
    String(completion.myVote?.points ?? basePoints ?? 50),
  );
  const [pending, startTransition] = useTransition();

  const status = completion.status as CompletionStatus;
  const isMine = completion.user.id === currentUserId;
  const canVote = status === "PENDING" && !isMine;

  // `award` is passed explicitly rather than read from state: the "0 point"
  // button sets the input and votes in the same handler, and the state update
  // isn't visible to this closure yet.
  function castVote(decision: ValidationDecision, award?: number) {
    const value = award ?? Number(points);
    startTransition(async () => {
      await voteValidation(
        groupId,
        completion.id,
        decision,
        decision === "VALIDATE" ? value : null,
      );
      toast.success(
        decision === "VALIDATE" ? "Vote enregistré" : "Preuve contestée",
      );
    });
  }

  return (
    <li className="rounded-xl border border-[var(--border-light)] p-3">
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarImage src={completion.user.image ?? undefined} alt="" />
          <AvatarFallback className="rounded-lg text-[10px]">
            {(completion.user.name ?? "?").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {completion.user.name ?? "Membre"}
            {completion.rank && (
              <span className="ml-2 text-xs text-[var(--text-muted)]">
                {completion.rank}
                <sup>e</sup>
              </span>
            )}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {relativeTime(completion.submittedAt)}
          </p>
        </div>
        <span className={cn("text-xs font-medium", STATUS_STYLE[status])}>
          {status === "PENDING" && `${completion.voteCount} vote(s)`}
          {status === "VALIDATED" && `+${completion.awardedPoints} karma`}
          {status === "REJECTED" && "Rejeté"}
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-[var(--border-light)]">
        <ProofMedia url={completion.proofUrl} />
      </div>

      {completion.note && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
          {completion.note}
        </p>
      )}

      {canVote && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border-light)] pt-3">
          <Input
            type="number"
            min={0}
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            className="w-24"
            aria-label="Karma attribué"
          />
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => castVote("VALIDATE")}
          >
            <Check size={15} />
            Valider
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setPoints("0");
              castVote("VALIDATE", 0);
            }}
          >
            0 point
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => castVote("REJECT")}
          >
            <X size={15} />
            Rejeter
          </Button>
          {completion.myVote && (
            <span className="text-[11px] text-[var(--text-muted)]">
              Ton vote :{" "}
              {completion.myVote.decision === "REJECT"
                ? "rejet"
                : `${completion.myVote.points} karma`}
            </span>
          )}
        </div>
      )}

      {status === "PENDING" && (
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          Clôture du vote {relativeTime(completion.voteClosesAt)}.
          {isMine && " Tu ne peux pas voter sur ta propre preuve."}
        </p>
      )}

      {status === "PENDING" && canCloseEarly && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-2"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await closeValidationEarly(groupId, completion.id);
              toast.success("Vote clôturé");
            })
          }
        >
          <Gavel size={15} />
          Clôturer maintenant
        </Button>
      )}
    </li>
  );
}
