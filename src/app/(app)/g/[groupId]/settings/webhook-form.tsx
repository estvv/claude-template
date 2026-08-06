"use client";

import { useActionState } from "react";
import {
  updateDiscordWebhook,
  type ActionState,
} from "@/app/(app)/groups/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WebhookForm({
  groupId,
  current,
}: {
  groupId: string;
  current: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateDiscordWebhook.bind(null, groupId),
    null,
  );

  return (
    <form action={action}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="webhookUrl"
          defaultValue={current}
          placeholder="https://discord.com/api/webhooks/…"
          className="font-mono text-xs sm:flex-1"
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </Button>
      </div>
      {state?.error && (
        <p className="mt-2 text-xs text-[var(--color-red)]">{state.error}</p>
      )}
      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
        Laisse vide pour désactiver. Le webhook se crée dans Discord :
        Paramètres du salon → Intégrations → Webhooks.
      </p>
    </form>
  );
}
