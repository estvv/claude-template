"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import type { AchievementMode } from "@/lib/domain";

export type ActionState = { error: string } | null;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return { error: "Le nom doit faire au moins 2 caractères." };
  }

  const slug = slugify(name);
  if (!slug) return { error: "Ce nom ne produit pas d'identifiant valide." };

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) return { error: "Cette catégorie existe déjà." };

  await prisma.category.create({ data: { name, slug } });
  revalidatePath("/admin");
  return null;
}

/**
 * Renames a category. The slug is left alone on purpose: it is what
 * leaderboard filter URLs are built from, so regenerating it would break
 * links people have already shared.
 */
export async function renameCategory(
  categoryId: string,
  name: string,
): Promise<ActionState> {
  await requireAdmin();

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { error: "Le nom doit faire au moins 2 caractères." };
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: { name: trimmed },
  });

  revalidatePath("/admin");
  return null;
}

export async function deleteCategory(categoryId: string) {
  await requireAdmin();

  // Categories are referenced by achievements; removing one in use would
  // orphan them, so it is blocked rather than cascaded.
  const inUse = await prisma.achievement.count({ where: { categoryId } });
  if (inUse > 0) return;

  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/admin");
}

export async function createTemplate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const mode = String(formData.get("mode") ?? "OPEN") as AchievementMode;
  const points = Number(formData.get("points") ?? 0);
  const durationDays = Number(formData.get("durationDays") ?? 7);

  if (title.length < 3) return { error: "Le titre doit faire 3 caractères." };
  if (!categoryId) return { error: "Choisis une catégorie." };
  if (!Number.isFinite(points) || points < 0) {
    return { error: "Le nombre de points doit être positif." };
  }
  if (!Number.isFinite(durationDays) || durationDays < 1) {
    return { error: "Le délai doit être d'au moins 1 jour." };
  }

  await prisma.achievementTemplate.create({
    data: {
      title,
      description,
      categoryId,
      mode,
      points: Math.round(points),
      durationDays: Math.round(durationDays),
    },
  });

  revalidatePath("/admin");
  return null;
}

export async function updateTemplate(
  templateId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const mode = String(formData.get("mode") ?? "OPEN") as AchievementMode;
  const points = Number(formData.get("points") ?? 0);
  const durationDays = Number(formData.get("durationDays") ?? 7);

  if (title.length < 3) return { error: "Le titre doit faire 3 caractères." };
  if (!categoryId) return { error: "Choisis une catégorie." };
  if (!Number.isFinite(points) || points < 0) {
    return { error: "Le nombre de points doit être positif." };
  }
  if (!Number.isFinite(durationDays) || durationDays < 1) {
    return { error: "Le délai doit être d'au moins 1 jour." };
  }

  // Achievements already created from this template keep the values they were
  // created with — only future ones pick up the change.
  await prisma.achievementTemplate.update({
    where: { id: templateId },
    data: {
      title,
      description,
      categoryId,
      mode,
      points: Math.round(points),
      durationDays: Math.round(durationDays),
    },
  });

  revalidatePath("/admin");
  return null;
}

export async function deleteTemplate(templateId: string) {
  await requireAdmin();
  await prisma.achievementTemplate.delete({ where: { id: templateId } });
  revalidatePath("/admin");
}

/**
 * Global moderation. These deliberately do NOT go through
 * `requireMembership`: a platform admin moderates groups they don't belong to,
 * and group pages stay members-only, so removal happens from /admin/moderation.
 */
export async function moderateAchievement(achievementId: string) {
  await requireAdmin();

  const achievement = await prisma.achievement.findUnique({
    where: { id: achievementId },
    select: { id: true, title: true, groupId: true, deletedAt: true },
  });
  if (!achievement || achievement.deletedAt) return;

  await prisma.achievement.update({
    where: { id: achievement.id },
    data: { deletedAt: new Date(), status: "CANCELLED" },
  });

  await logActivity(
    achievement.groupId,
    `« ${achievement.title} » a été supprimé par un administrateur.`,
  );

  revalidatePath("/admin/moderation");
}

export async function moderateMessage(messageId: string) {
  await requireAdmin();

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, deletedAt: true },
  });
  if (!message || message.deletedAt) return;

  await prisma.message.update({
    where: { id: message.id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/admin/moderation");
}
