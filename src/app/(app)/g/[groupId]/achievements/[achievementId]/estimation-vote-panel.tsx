"use client";

import { useState, useTransition } from "react";
import { Scale } from "lucide-react";
import { toast } from "sonner";
import { voteEstimation } from "../actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { relativeTime } from "@/lib/format";

export function EstimationVotePanel({
  groupId,
  achievementId,
  voteCount,
  myPoints,
  closesAt,
}: {
  groupId: string;
  achievementId: string;
  voteCount: number;
  myPoints: number | null;
  closesAt: Date | null;
}) {
  const [points, setPoints] = useState(String(myPoints ?? 50));
  const [pending, startTransition] = useTransition();

  return (
    <Card className="mb-4 gap-0 border-[var(--color-blue)]/30 bg-[var(--color-blue-light)]/40 p-5 shadow-none">
      <div className="flex items-center gap-2">
        <Scale size={16} className="text-[var(--color-blue)]" />
        <p className="text-sm font-semibold">Combien ça vaut ?</p>
      </div>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        Le groupe estime la valeur de cet achievement.{" "}
        {voteCount} vote{voteCount > 1 ? "s" : ""}
        {closesAt ? ` — clôture ${relativeTime(closesAt)}.` : "."}
      </p>

      <div className="mt-4 flex gap-2">
        <Input
          type="number"
          min={0}
          value={points}
          onChange={(event) => setPoints(event.target.value)}
          className="w-28 bg-white"
        />
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await voteEstimation(groupId, achievementId, Number(points));
              toast.success("Estimation enregistrée");
            })
          }
        >
          {myPoints === null ? "Voter" : "Modifier mon vote"}
        </Button>
      </div>
    </Card>
  );
}
