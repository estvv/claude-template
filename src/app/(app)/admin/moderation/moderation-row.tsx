"use client";

import { useTransition } from "react";
import { Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { moderateAchievement, moderateMessage } from "../actions";

export function ModerationRow({
  id,
  kind,
  title,
  meta,
  hasAttachment = false,
}: {
  id: string;
  kind: "achievement" | "message";
  title: string;
  meta: string;
  hasAttachment?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="group flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          {title}
          {hasAttachment && (
            <Paperclip
              size={12}
              className="ml-1.5 inline text-[var(--text-muted)]"
            />
          )}
        </p>
        <p className="truncate text-[11px] text-[var(--text-muted)]">{meta}</p>
      </div>
      <button
        type="button"
        aria-label="Supprimer"
        disabled={pending}
        className="shrink-0 p-1 text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--color-red)] disabled:opacity-20 group-hover:opacity-100"
        onClick={() =>
          startTransition(async () => {
            if (kind === "achievement") await moderateAchievement(id);
            else await moderateMessage(id);
            toast.success("Contenu supprimé");
          })
        }
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}
