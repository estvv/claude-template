"use client";

import { useActionState } from "react";
import { createGroup, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateGroupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createGroup,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nom du groupe</Label>
        <Input id="name" name="name" placeholder="Les Potos" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optionnel)</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="À quoi sert ce groupe ?"
        />
      </div>

      {state?.error && (
        <p className="text-xs text-[var(--color-red)]">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Création…" : "Créer le groupe"}
      </Button>
    </form>
  );
}
