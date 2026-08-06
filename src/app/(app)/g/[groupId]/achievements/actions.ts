"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canModerate, requireMembership } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { saveUpload, UploadError } from "@/lib/uploads";
import { resolveCompletion } from "@/lib/tick";
import {
  ESTIMATION_WINDOW_HOURS,
  VALIDATION_WINDOW_HOURS,
} from "@/lib/constants";
import type { AchievementMode, ValidationDecision } from "@/lib/domain";

export type ActionState = { error: string } | null;

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function createAchievement(
  groupId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, isOwner } = await requireMembership(groupId);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const mode = String(formData.get("mode") ?? "OPEN") as AchievementMode;
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const durationDays = Number(formData.get("durationDays") ?? 7);
  const fixedPoints = Number(formData.get("points") ?? 0);
  const templateId = String(formData.get("templateId") ?? "") || null;

  if (title.length < 3) {
    return { error: "Le titre doit faire au moins 3 caractères." };
  }
  if (!categoryId) {
    return { error: "Choisis une catégorie." };
  }
  if (!Number.isFinite(durationDays) || durationDays < 1) {
    return { error: "Le délai doit être d'au moins 1 jour." };
  }
  if (mode === "PERSONAL" && !targetUserId) {
    return { error: "Choisis la personne visée par ce défi." };
  }

  if (mode === "PERSONAL") {
    const target = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (!target) return { error: "Cette personne n'est pas dans le groupe." };
  }

  // Owners and platform admins set the value directly; everyone else's
  // achievement goes through a community estimation vote first.
  const setsPointsDirectly = isOwner || user.isPlatformAdmin;
  if (setsPointsDirectly && (!Number.isFinite(fixedPoints) || fixedPoints < 0)) {
    return { error: "Le nombre de points doit être positif." };
  }

  // Kept for provenance only: the template pre-fills the form, it does not
  // grant the right to skip the estimation vote (that follows from the role).
  const template = templateId
    ? await prisma.achievementTemplate.findUnique({ where: { id: templateId } })
    : null;

  const achievement = await prisma.achievement.create({
    data: {
      groupId,
      creatorId: user.id,
      categoryId,
      templateId: template?.id ?? null,
      title,
      description,
      mode,
      targetUserId: mode === "PERSONAL" ? targetUserId : null,
      deadline: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      status: setsPointsDirectly ? "ACTIVE" : "ESTIMATING",
      basePoints: setsPointsDirectly ? fixedPoints : null,
      estimationClosesAt: setsPointsDirectly
        ? null
        : hoursFromNow(ESTIMATION_WINDOW_HOURS),
    },
  });

  await logActivity(
    groupId,
    `${user.name ?? "Un membre"} a créé « ${title} »` +
      (setsPointsDirectly
        ? ` (${fixedPoints} karma).`
        : " — estimation des points en cours."),
  );

  redirect(`/g/${groupId}/achievements/${achievement.id}`);
}

export async function voteEstimation(
  groupId: string,
  achievementId: string,
  points: number,
) {
  const { user } = await requireMembership(groupId);

  const achievement = await prisma.achievement.findFirst({
    where: { id: achievementId, groupId, status: "ESTIMATING" },
  });
  if (!achievement) return;
  if (!Number.isFinite(points) || points < 0) return;

  await prisma.estimationVote.upsert({
    where: { achievementId_userId: { achievementId, userId: user.id } },
    create: { achievementId, userId: user.id, points: Math.round(points) },
    update: { points: Math.round(points) },
  });

  revalidatePath(`/g/${groupId}/achievements/${achievementId}`);
}

export async function submitCompletion(
  groupId: string,
  achievementId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireMembership(groupId);

  const achievement = await prisma.achievement.findFirst({
    where: { id: achievementId, groupId, deletedAt: null },
  });
  if (!achievement) return { error: "Achievement introuvable." };
  if (achievement.status !== "ACTIVE") {
    return { error: "Cet achievement n'accepte plus de soumissions." };
  }
  if (achievement.mode === "PERSONAL" && achievement.targetUserId !== user.id) {
    return { error: "Seule la personne visée peut soumettre ce défi." };
  }

  const alreadyIn = await prisma.completion.findFirst({
    where: {
      achievementId,
      userId: user.id,
      status: { in: ["PENDING", "VALIDATED"] },
    },
  });
  if (alreadyIn) {
    return {
      error:
        alreadyIn.status === "PENDING"
          ? "Tu as déjà une preuve en attente de validation."
          : "Tu as déjà validé cet achievement.",
    };
  }

  const proof = formData.get("proof");
  if (!(proof instanceof File) || proof.size === 0) {
    return { error: "Une preuve (photo ou vidéo) est obligatoire." };
  }

  let proofUrl: string;
  try {
    proofUrl = await saveUpload(proof);
  } catch (error) {
    if (error instanceof UploadError) return { error: error.message };
    throw error;
  }

  await prisma.completion.create({
    data: {
      achievementId,
      userId: user.id,
      proofUrl,
      note: String(formData.get("note") ?? "").trim() || null,
      voteClosesAt: hoursFromNow(VALIDATION_WINDOW_HOURS),
    },
  });

  await logActivity(
    groupId,
    `${user.name ?? "Un membre"} a soumis une preuve pour « ${achievement.title} » — à valider.`,
  );

  revalidatePath(`/g/${groupId}/achievements/${achievementId}`);
  return null;
}

export async function voteValidation(
  groupId: string,
  completionId: string,
  decision: ValidationDecision,
  points: number | null,
) {
  const { user } = await requireMembership(groupId);

  const completion = await prisma.completion.findFirst({
    where: { id: completionId, status: "PENDING", achievement: { groupId } },
    include: { achievement: { select: { id: true } } },
  });
  if (!completion) return;
  // Judging your own proof would defeat the point of community validation.
  if (completion.userId === user.id) return;

  await prisma.validationVote.upsert({
    where: { completionId_userId: { completionId, userId: user.id } },
    create: {
      completionId,
      userId: user.id,
      decision,
      points: decision === "VALIDATE" ? Math.max(0, Math.round(points ?? 0)) : null,
    },
    update: {
      decision,
      points: decision === "VALIDATE" ? Math.max(0, Math.round(points ?? 0)) : null,
    },
  });

  revalidatePath(`/g/${groupId}/achievements/${completion.achievement.id}`);
}

/** Lets the group settle a proof early instead of waiting out the window. */
export async function closeValidationEarly(
  groupId: string,
  completionId: string,
) {
  const { isOwner, user } = await requireMembership(groupId);
  if (!isOwner && !user.isPlatformAdmin) return;

  const completion = await prisma.completion.findFirst({
    where: { id: completionId, status: "PENDING", achievement: { groupId } },
    select: { achievementId: true },
  });
  if (!completion) return;

  await resolveCompletion(completionId);
  revalidatePath(`/g/${groupId}/achievements/${completion.achievementId}`);
}

export async function postMessage(
  groupId: string,
  achievementId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireMembership(groupId);

  const body = String(formData.get("body") ?? "").trim();
  const image = formData.get("image");
  const hasImage = image instanceof File && image.size > 0;

  if (!body && !hasImage) {
    return { error: "Écris un message ou joins une image." };
  }

  let imageUrl: string | null = null;
  if (hasImage) {
    try {
      imageUrl = await saveUpload(image);
    } catch (error) {
      if (error instanceof UploadError) return { error: error.message };
      throw error;
    }
  }

  await prisma.message.create({
    data: { achievementId, userId: user.id, body, imageUrl },
  });

  revalidatePath(`/g/${groupId}/achievements/${achievementId}`);
  return null;
}

export async function deleteMessage(groupId: string, messageId: string) {
  const { user, group } = await requireMembership(groupId);

  const message = await prisma.message.findFirst({
    where: { id: messageId, achievement: { groupId } },
  });
  if (!message) return;

  if (
    !canModerate({ authorId: message.userId, groupOwnerId: group.ownerId, user })
  ) {
    return;
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/g/${groupId}/achievements/${message.achievementId}`);
}

export async function deleteAchievement(groupId: string, achievementId: string) {
  const { user, group } = await requireMembership(groupId);

  const achievement = await prisma.achievement.findFirst({
    where: { id: achievementId, groupId },
    include: { _count: { select: { completions: true } } },
  });
  if (!achievement) return;

  if (
    !canModerate({
      authorId: achievement.creatorId,
      groupOwnerId: group.ownerId,
      user,
    })
  ) {
    return;
  }

  // The creator may only withdraw an untouched achievement; moderators can
  // always take one down.
  const isModerator = user.id === group.ownerId || user.isPlatformAdmin;
  if (!isModerator && achievement._count.completions > 0) return;

  await prisma.achievement.update({
    where: { id: achievementId },
    data: { deletedAt: new Date(), status: "CANCELLED" },
  });

  await logActivity(groupId, `« ${achievement.title} » a été supprimé.`);
  redirect(`/g/${groupId}/achievements`);
}
