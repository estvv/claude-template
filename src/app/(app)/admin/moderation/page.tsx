import { ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui-patterns";
import { Card } from "@/components/ui/card";
import { ModerationRow } from "./moderation-row";

/**
 * Global moderation across every group. Group pages themselves stay
 * members-only, so this is where a platform admin acts on content in groups
 * they don't belong to.
 */
export default async function ModerationPage() {
  await requireAdmin();

  const [achievements, messages] = await Promise.all([
    prisma.achievement.findMany({
      where: { deletedAt: null },
      include: {
        group: { select: { name: true } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.message.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { name: true } },
        achievement: {
          select: { title: true, group: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={ShieldAlert}
        title="Modération"
        description="Contenus récents de tous les groupes, y compris ceux dont tu n'es pas membre."
      />

      <div className="space-y-4">
        <Card className="gap-0 border-[var(--border-light)] p-5 shadow-none">
          <p className="mb-4 text-lg font-semibold">
            Achievements récents ({achievements.length})
          </p>
          {achievements.length === 0 ? (
            <EmptyState title="Aucun achievement" />
          ) : (
            <ul className="divide-y divide-[var(--border-light)]">
              {achievements.map((achievement) => (
                <ModerationRow
                  key={achievement.id}
                  id={achievement.id}
                  kind="achievement"
                  title={achievement.title}
                  meta={`${achievement.group.name} · ${achievement.creator.name ?? "un membre"} · ${relativeTime(achievement.createdAt)}`}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-0 border-[var(--border-light)] p-5 shadow-none">
          <p className="mb-4 text-lg font-semibold">
            Messages récents ({messages.length})
          </p>
          {messages.length === 0 ? (
            <EmptyState title="Aucun message" />
          ) : (
            <ul className="divide-y divide-[var(--border-light)]">
              {messages.map((message) => (
                <ModerationRow
                  key={message.id}
                  id={message.id}
                  kind="message"
                  title={message.body || "(pièce jointe seule)"}
                  meta={`${message.achievement.group.name} · ${message.achievement.title} · ${message.user.name ?? "un membre"} · ${relativeTime(message.createdAt)}`}
                  hasAttachment={message.imageUrl !== null}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
