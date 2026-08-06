import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui-patterns";
import { CreateAchievementForm } from "./create-achievement-form";

export default async function NewAchievementPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { user, isOwner } = await requireMembership(groupId);

  const [categories, members, templates] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.achievementTemplate.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { title: "asc" },
    }),
  ]);

  const setsPointsDirectly = isOwner || user.isPlatformAdmin;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        icon={Plus}
        title="Nouvel achievement"
        description={
          setsPointsDirectly
            ? "Tu fixes directement sa valeur en karma."
            : "Le groupe votera pour estimer sa valeur en karma."
        }
        backHref={`/g/${groupId}/achievements`}
      />

      {categories.length === 0 ? (
        <EmptyState
          title="Aucune catégorie disponible"
          description="Les catégories sont gérées par les administrateurs de la plateforme. Il faut en créer au moins une avant de pouvoir lancer un achievement."
        />
      ) : (
        <Card className="border-[var(--border-light)] p-5 shadow-none">
          <CreateAchievementForm
            groupId={groupId}
            categories={categories}
            members={members.map((m) => ({
              id: m.user.id,
              name: m.user.name ?? "Membre",
            }))}
            templates={templates.map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              mode: t.mode,
              points: t.points,
              durationDays: t.durationDays,
              categoryId: t.categoryId,
              categoryName: t.category.name,
            }))}
            setsPointsDirectly={setsPointsDirectly}
          />
        </Card>
      )}
    </div>
  );
}
