import { Shield } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { CategoryManager } from "./category-manager";
import { TemplateManager } from "./template-manager";

export default async function AdminPage() {
  await requireAdmin();

  const [categories, templates] = await Promise.all([
    prisma.category.findMany({
      include: { _count: { select: { achievements: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.achievementTemplate.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={Shield}
        title="Administration"
        description="Catégories et modèles d'achievement, partagés par tous les groupes."
      />

      <div className="space-y-4">
        <Card className="gap-0 border-[var(--border-light)] p-5 shadow-none">
          <p className="text-lg font-semibold">Catégories</p>
          <p className="mt-0.5 mb-4 text-xs text-[var(--text-muted)]">
            Liste fixe : les membres choisissent parmi celles-ci, ils ne peuvent
            pas en créer.
          </p>
          <CategoryManager
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              usageCount: c._count.achievements,
            }))}
          />
        </Card>

        <Card className="gap-0 border-[var(--border-light)] p-5 shadow-none">
          <p className="text-lg font-semibold">Modèles d&apos;achievement</p>
          <p className="mt-0.5 mb-4 text-xs text-[var(--text-muted)]">
            Réutilisables dans n&apos;importe quel groupe. Leur valeur en karma
            est fixée ici — pas de vote d&apos;estimation.
          </p>
          <TemplateManager
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
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
          />
        </Card>
      </div>
    </div>
  );
}
