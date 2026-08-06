import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { loadGroupContext } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { MonthCalendar } from "./month-calendar";

/** Visual month calendar of the group's achievement deadlines. */
export default async function GroupCalendarPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  await loadGroupContext(groupId);

  const achievements = await prisma.achievement.findMany({
    where: { groupId, deletedAt: null },
    include: {
      category: { select: { name: true } },
      targetUser: { select: { name: true } },
    },
    orderBy: { deadline: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={CalendarDays}
        title="Calendrier"
        description="Les échéances des achievements du groupe."
      />

      <MonthCalendar groupId={groupId} achievements={achievements} />
    </div>
  );
}
