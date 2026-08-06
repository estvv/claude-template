"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
  type ActionState,
} from "./actions";
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
import { EmptyState } from "@/components/ui-patterns";

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

type Category = { id: string; name: string };

/** Field set shared by the create form and the inline edit form. */
function TemplateFields({
  categories,
  template,
  idPrefix,
}: {
  categories: Category[];
  template?: Template;
  idPrefix: string;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`}>Titre</Label>
        <Input
          id={`${idPrefix}-title`}
          name="title"
          defaultValue={template?.title}
          placeholder="Courir 10 km"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          name="description"
          rows={2}
          defaultValue={template?.description}
          placeholder="Ce qu'il faut faire, et ce qui compte comme preuve."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-category`}>Catégorie</Label>
          <Select name="categoryId" defaultValue={template?.categoryId} required>
            <SelectTrigger id={`${idPrefix}-category`} className="w-full">
              <SelectValue placeholder="Choisir" />
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
          <Label htmlFor={`${idPrefix}-mode`}>Type</Label>
          <Select name="mode" defaultValue={template?.mode ?? "OPEN"}>
            <SelectTrigger id={`${idPrefix}-mode`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Compétition</SelectItem>
              <SelectItem value="PERSONAL">Défi personnel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-points`}>Karma</Label>
          <Input
            id={`${idPrefix}-points`}
            name="points"
            type="number"
            min={0}
            defaultValue={template?.points ?? 50}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-days`}>Délai (jours)</Label>
          <Input
            id={`${idPrefix}-days`}
            name="durationDays"
            type="number"
            min={1}
            defaultValue={template?.durationDays ?? 7}
            required
          />
        </div>
      </div>
    </>
  );
}

function TemplateRow({
  template,
  categories,
}: {
  template: Template;
  categories: Category[];
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, action, saving] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await updateTemplate(template.id, prev, formData);
      if (!result) {
        setEditing(false);
        toast.success("Modèle mis à jour");
      }
      return result;
    },
    null,
  );

  if (editing) {
    return (
      <li className="py-4">
        <form action={action} className="space-y-3">
          <TemplateFields
            categories={categories}
            template={template}
            idPrefix={`edit-${template.id}`}
          />
          {state?.error && (
            <p className="text-xs text-[var(--color-red)]">{state.error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "…" : "Enregistrer"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Annuler
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{template.title}</p>
        <p className="text-[11px] text-[var(--text-muted)]">
          {template.categoryName} ·{" "}
          {template.mode === "OPEN" ? "Compétition" : "Personnel"} ·{" "}
          {template.points} karma · {template.durationDays} j
        </p>
      </div>
      <button
        type="button"
        aria-label={`Modifier ${template.title}`}
        className="shrink-0 p-1 text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--text-primary)] group-hover:opacity-100"
        onClick={() => setEditing(true)}
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        aria-label={`Supprimer ${template.title}`}
        disabled={pending}
        className="shrink-0 p-1 text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--color-red)] group-hover:opacity-100"
        onClick={() =>
          startTransition(async () => {
            await deleteTemplate(template.id);
            toast.success("Modèle supprimé");
          })
        }
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

export function TemplateManager({
  categories,
  templates,
}: {
  categories: Category[];
  templates: Template[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createTemplate,
    null,
  );

  return (
    <div>
      {categories.length === 0 ? (
        <EmptyState
          title="Crée d'abord une catégorie"
          description="Un modèle doit être rattaché à une catégorie."
        />
      ) : (
        <form action={action} className="mb-5 space-y-3">
          <TemplateFields categories={categories} idPrefix="new" />

          {state?.error && (
            <p className="text-xs text-[var(--color-red)]">{state.error}</p>
          )}

          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "…" : "Ajouter le modèle"}
          </Button>
        </form>
      )}

      {templates.length === 0 ? (
        <EmptyState title="Aucun modèle" />
      ) : (
        <ul className="divide-y divide-[var(--border-light)] border-t border-[var(--border-light)]">
          {templates.map((template) => (
            <TemplateRow
              key={template.id}
              template={template}
              categories={categories}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
