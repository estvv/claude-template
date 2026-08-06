"use client";

import { useTransition } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { deleteAchievement } from "../actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AchievementActions({
  groupId,
  achievementId,
  canDelete,
}: {
  groupId: string;
  achievementId: string;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!canDelete) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Actions"
          className="shrink-0 rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]"
        >
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onSelect={() =>
            startTransition(() => {
              void deleteAchievement(groupId, achievementId);
            })
          }
        >
          <Trash2 size={15} />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
