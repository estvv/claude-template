"use client";

import { useActionState, useState } from "react";
import { createAchievement, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  title: string;
  description: string;
  mode: string;
  points: number;
  durationDays: number;
  categoryId: string;
  categoryName: string;
};

type Props = {
  groupId: string;
  categories: { id: string; name: string }[];
  members: { id: string; name: string }[];
  templates: Template[];
  setsPointsDirectly: boolean;
};

export function CreateAchievementForm({
  groupId,
  categories,
  members,
  templates,
  setsPointsDirectly,
}: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createAchievement.bind(null, groupId),
    null,
  );

  const [mode, setMode] = useState("OPEN");
  const [applied, setApplied] = useState<Template | null>(null);

  function applyTemplate(template: Template) {
    setApplied(template);
    setMode(template.mode);
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="templateId" value={applied?.id ?? ""} />

      {templates.length > 0 && (
        <div className="space-y-1.5">
          <Label>Partir d&apos;un modèle (optionnel)</Label>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                  applied?.id === template.id
                    ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-white"
                    : "border-dashed border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]",
                )}
              >
                {template.title}
                <span className="ml-1.5 opacity-60">
                  {template.points} karma
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title">Titre</Label>
        <Input
          key={`title-${applied?.id ?? "blank"}`}
          id="title"
          name="title"
          defaultValue={applied?.title ?? ""}
          placeholder="Courir 10 km"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          key={`desc-${applied?.id ?? "blank"}`}
          id="description"
          name="description"
          rows={3}
          defaultValue={applied?.description ?? ""}
          placeholder="Ce qu'il faut faire exactement, et ce qui compte comme preuve."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="categoryId">Catégorie</Label>
        <Select
          key={`cat-${applied?.id ?? "blank"}`}
          name="categoryId"
          defaultValue={applied?.categoryId}
          required
        >
          <SelectTrigger id="categoryId" className="w-full">
            <SelectValue placeholder="Choisir une catégorie" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="mode">Type</Label>
        <Select name="mode" value={mode} onValueChange={setMode}>
          <SelectTrigger id="mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">
              Compétition — tout le groupe peut le tenter
            </SelectItem>
            <SelectItem value="PERSONAL">
              Défi personnel — une personne visée
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-[var(--text-muted)]">
          {mode === "OPEN"
            ? "Les points sont dégressifs selon l'ordre d'arrivée. Le pari associé porte sur qui finira premier."
            : "Résultat oui/non avant le délai. Le pari associé porte sur sa réussite."}
        </p>
      </div>

      {mode === "PERSONAL" && (
        <div className="space-y-1.5">
          <Label htmlFor="targetUserId">Personne visée</Label>
          <Select name="targetUserId" required>
            <SelectTrigger id="targetUserId" className="w-full">
              <SelectValue placeholder="Qui doit le faire ?" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="durationDays">Délai (jours)</Label>
          <Input
            key={`days-${applied?.id ?? "blank"}`}
            id="durationDays"
            name="durationDays"
            type="number"
            min={1}
            defaultValue={applied?.durationDays ?? 7}
            required
          />
        </div>

        {setsPointsDirectly && (
          <div className="space-y-1.5">
            <Label htmlFor="points">Valeur (karma)</Label>
            <Input
              key={`pts-${applied?.id ?? "blank"}`}
              id="points"
              name="points"
              type="number"
              min={0}
              defaultValue={applied?.points ?? 50}
              required
            />
          </div>
        )}
      </div>

      {!setsPointsDirectly && (
        <p className="rounded-lg border border-dashed border-[var(--border-light)] bg-[var(--bg-primary)]/40 px-3 py-2 text-[11px] text-[var(--text-muted)]">
          Le groupe a 48 h pour estimer la valeur en karma de cet achievement
          avant qu&apos;il ne démarre.
        </p>
      )}

      {state?.error && (
        <p className="text-xs text-[var(--color-red)]">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Création…" : "Créer l'achievement"}
      </Button>
    </form>
  );
}
