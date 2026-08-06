"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui-patterns";
import { formatDateTime, formatDay, isPast, relativeTime } from "@/lib/format";

export type CalendarAchievement = {
  id: string;
  title: string;
  deadline: Date;
  createdAt: Date;
  category: { name: string };
  targetUser: { name: string | null } | null;
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const monthLabelFormatter = new Intl.DateTimeFormat("fr", {
  month: "long",
  year: "numeric",
});

/** Monday-first grid covering the full month, padded with adjacent days. */
function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, i) => {
    const date = new Date(year, month, 1 - startOffset + i);
    return { date, inMonth: date.getMonth() === month };
  });
}

export function MonthCalendar({
  groupId,
  achievements,
}: {
  groupId: string;
  achievements: CalendarAchievement[];
}) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarAchievement[]>();
    for (const achievement of achievements) {
      const key = achievement.deadline.toDateString();
      map.set(key, [...(map.get(key) ?? []), achievement]);
    }
    return map;
  }, [achievements]);

  const grid = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const daysToShow = selectedDay
    ? [selectedDay]
    : [...byDay.keys()]
        .filter((key) => {
          const date = new Date(key);
          return (
            date.getMonth() === cursor.getMonth() &&
            date.getFullYear() === cursor.getFullYear()
          );
        })
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div>
      <Card className="gap-0 border-[var(--border-light)] p-4 shadow-none">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold capitalize">
            {monthLabelFormatter.format(cursor)}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
                setSelectedDay(null);
              }}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
                setSelectedDay(null);
              }}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[var(--text-muted)]">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map(({ date, inMonth }) => {
            const key = date.toDateString();
            const items = byDay.get(key) ?? [];
            const isToday = key === today.toDateString();
            const isSelected = key === selectedDay;

            return (
              <button
                key={key}
                type="button"
                disabled={items.length === 0}
                onClick={() => setSelectedDay(isSelected ? null : key)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors",
                  inMonth ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]/50",
                  items.length > 0 && "cursor-pointer hover:bg-[var(--sidebar-hover)]",
                  isToday && "font-bold",
                  isSelected && "bg-[var(--sidebar-active)] ring-1 ring-inset ring-[var(--border-card)]",
                )}
              >
                <span>{date.getDate()}</span>
                {items.length > 0 && (
                  <span className="flex gap-0.5">
                    {items.slice(0, 3).map((item) => (
                      <span
                        key={item.id}
                        className={cn(
                          "size-1.5 rounded-full",
                          isPast(item.deadline)
                            ? "bg-[var(--text-muted)]"
                            : "bg-[var(--color-blue)]",
                        )}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="mt-6">
        {selectedDay && (
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="mb-3 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            ← Voir tout le mois
          </button>
        )}

        {daysToShow.length === 0 ? (
          <EmptyState title="Aucune échéance ce mois-ci" />
        ) : (
          <div className="space-y-6">
            {daysToShow.map((day) => {
              const items = byDay.get(day) ?? [];
              const past = items.length > 0 && isPast(items[0].deadline);
              return (
                <section key={day}>
                  <h2
                    className={cn(
                      "mb-2 text-sm font-semibold capitalize",
                      past && "text-[var(--text-muted)]",
                    )}
                  >
                    {formatDay(new Date(day))}
                  </h2>
                  <Card className="gap-0 border-[var(--border-light)] p-0 shadow-none">
                    <ul className="divide-y divide-[var(--border-light)]">
                      {items.map((achievement) => (
                        <li key={achievement.id}>
                          <Link
                            href={`/g/${groupId}/achievements/${achievement.id}`}
                            className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--sidebar-hover)]"
                          >
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "truncate text-sm font-medium",
                                  isPast(achievement.deadline) &&
                                    "text-[var(--text-muted)]",
                                )}
                              >
                                {achievement.title}
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                {achievement.category.name}
                                {achievement.targetUser &&
                                  ` · ${achievement.targetUser.name}`}
                                {` · créé le ${formatDateTime(achievement.createdAt)}`}
                              </p>
                            </div>
                            <span className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--text-muted)]">
                              <Clock size={12} />
                              {relativeTime(achievement.deadline)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
