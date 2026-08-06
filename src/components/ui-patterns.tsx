import type { LucideIcon } from "lucide-react";
import { Coins, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/** Stat tile: label + icon top-left, big value below. */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="gap-0 border-[var(--border-light)] p-4 shadow-none">
      <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
        <Icon size={14} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint && (
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{hint}</p>
      )}
    </Card>
  );
}

/** Dashed, centred block shown wherever a list can legitimately be empty. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border-light)] bg-[var(--bg-primary)]/40 px-6 py-10 text-center">
      <p className="text-sm font-medium text-[var(--text-secondary)]">
        {title}
      </p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-xs text-[var(--text-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Karma amount with its currency colour. */
export function KarmaBadge({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-bold text-[var(--color-karma)]",
        className,
      )}
    >
      <Trophy size={13} />
      {value}
    </span>
  );
}

/** Token amount with its currency colour. */
export function TokenBadge({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-bold text-[var(--color-token)]",
        className,
      )}
    >
      <Coins size={13} />
      {value}
    </span>
  );
}
