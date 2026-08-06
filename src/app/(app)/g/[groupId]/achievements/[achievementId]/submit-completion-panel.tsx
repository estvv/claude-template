"use client";

import { useActionState } from "react";
import { Camera } from "lucide-react";
import { submitCompletion, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACCEPTED_UPLOAD_TYPES } from "@/lib/upload-types";

export function SubmitCompletionPanel({
  groupId,
  achievementId,
  alreadySubmitted,
}: {
  groupId: string;
  achievementId: string;
  alreadySubmitted: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    submitCompletion.bind(null, groupId, achievementId),
    null,
  );

  if (alreadySubmitted) return null;

  return (
    <Card className="mb-4 gap-0 border-[var(--border-light)] p-5 shadow-none">
      <div className="flex items-center gap-2">
        <Camera size={16} />
        <p className="text-sm font-semibold">Je l&apos;ai fait</p>
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Une preuve est obligatoire. Elle ouvre le vote de validation du groupe.
      </p>

      <form action={action} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="proof">Preuve (photo, vidéo, audio ou capture)</Label>
          <Input
            id="proof"
            name="proof"
            type="file"
            accept={ACCEPTED_UPLOAD_TYPES}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note">Note (optionnel)</Label>
          <Textarea
            id="note"
            name="note"
            rows={2}
            placeholder="Un mot sur comment ça s'est passé…"
          />
        </div>

        {state?.error && (
          <p className="text-xs text-[var(--color-red)]">{state.error}</p>
        )}

        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Envoi…" : "Soumettre ma preuve"}
        </Button>
      </form>
    </Card>
  );
}
