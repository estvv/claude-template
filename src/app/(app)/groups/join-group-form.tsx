"use client";

import { useActionState } from "react";
import { joinGroup, type ActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function JoinGroupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    joinGroup,
    null,
  );

  return (
    <form action={action}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="code"
          placeholder="Code d'invitation"
          required
          className="sm:flex-1"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Rejoindre"}
        </Button>
      </div>
      {state?.error && (
        <p className="mt-2 text-xs text-[var(--color-red)]">{state.error}</p>
      )}
    </form>
  );
}
