"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  type ActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui-patterns";

type Category = {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
};

function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await renameCategory(category.id, name);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setEditing(false);
      toast.success("Catégorie renommée");
    });
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-8 flex-1"
          autoFocus
        />
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          <Check size={14} />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setName(category.name);
            setEditing(false);
          }}
        >
          <X size={14} />
        </Button>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="min-w-0 flex-1 truncate text-sm">
        {category.name}
        <span className="ml-2 font-mono text-[10px] text-[var(--text-muted)]">
          {category.slug}
        </span>
      </span>
      <span className="shrink-0 text-xs text-[var(--text-muted)]">
        {category.usageCount} usage(s)
      </span>
      <button
        type="button"
        aria-label={`Renommer ${category.name}`}
        className="shrink-0 p-1 text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--text-primary)] group-hover:opacity-100"
        onClick={() => setEditing(true)}
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        aria-label={`Supprimer ${category.name}`}
        disabled={category.usageCount > 0 || pending}
        title={
          category.usageCount > 0
            ? "Catégorie utilisée par des achievements"
            : undefined
        }
        className="shrink-0 p-1 text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--color-red)] disabled:cursor-not-allowed disabled:opacity-20 group-hover:opacity-100 disabled:group-hover:opacity-20"
        onClick={() =>
          startTransition(async () => {
            await deleteCategory(category.id);
            toast.success("Catégorie supprimée");
          })
        }
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createCategory,
    null,
  );

  return (
    <div>
      <form action={action} className="mb-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            name="name"
            placeholder="Sport, Social, Créativité…"
            required
            className="sm:flex-1"
          />
          <Button type="submit" disabled={pending}>
            {pending ? "…" : "Ajouter"}
          </Button>
        </div>
        {state?.error && (
          <p className="mt-2 text-xs text-[var(--color-red)]">{state.error}</p>
        )}
      </form>

      {categories.length === 0 ? (
        <EmptyState
          title="Aucune catégorie"
          description="Il en faut au moins une pour que les membres puissent créer des achievements."
        />
      ) : (
        <ul className="divide-y divide-[var(--border-light)]">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
      )}
    </div>
  );
}
