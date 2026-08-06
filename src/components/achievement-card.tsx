import Link from "next/link";
import { Clock, Coins, Target, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { relativeTime } from "@/lib/format";
import type { AchievementStatus } from "@/lib/domain";

export type AchievementCardData = {
  id: string;
  title: string;
  mode: string;
  status: string;
  basePoints: number | null;
  deadline: Date;
  category: { name: string };
  targetUser: { name: string | null } | null;
  hasBet: boolean;
  completionCount: number;
};

const STATUS_STYLES: Record<AchievementStatus, string> = {
  ESTIMATING:
    "border-[var(--color-blue)]/30 bg-[var(--color-blue-light)] text-[var(--color-blue)]",
  ACTIVE:
    "border-[var(--color-green)]/30 bg-[var(--color-green-light)] text-[var(--color-green)]",
  RESOLVED: "border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-muted)]",
  CANCELLED: "border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-muted)]",
};

const STATUS_LABELS: Record<AchievementStatus, string> = {
  ESTIMATING: "Estimation",
  ACTIVE: "En cours",
  RESOLVED: "Terminé",
  CANCELLED: "Annulé",
};

export function AchievementCard({
  groupId,
  achievement,
}: {
  groupId: string;
  achievement: AchievementCardData;
}) {
  const status = achievement.status as AchievementStatus;
  const isPersonal = achievement.mode === "PERSONAL";

  return (
    <Link href={`/g/${groupId}/achievements/${achievement.id}`}>
      <Card className="h-full gap-0 border-[var(--border-light)] p-4 shadow-none transition-colors hover:bg-[var(--sidebar-hover)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{achievement.title}</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {achievement.category.name}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-bold shadow-sm",
              STATUS_STYLES[status],
            )}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            {isPersonal ? <User size={13} /> : <Target size={13} />}
            {isPersonal
              ? (achievement.targetUser?.name ?? "—")
              : "Compétition"}
          </span>

          {achievement.basePoints !== null && (
            <span className="font-medium text-[var(--color-karma)]">
              {achievement.basePoints} karma
            </span>
          )}

          {achievement.hasBet && (
            <span className="flex items-center gap-1 text-[var(--color-token)]">
              <Coins size={13} />
              Pari
            </span>
          )}

          <span className="ml-auto flex items-center gap-1">
            <Clock size={13} />
            {status === "RESOLVED" || status === "CANCELLED"
              ? "clos"
              : relativeTime(achievement.deadline)}
          </span>
        </div>
      </Card>
    </Link>
  );
}
