"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireMembership } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { STARTING_TOKENS } from "@/lib/constants";

export type ActionState = { error: string } | null;

function newInviteCode() {
  return randomBytes(6).toString("base64url");
}

export async function createGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (name.length < 2) {
    return { error: "Le nom du groupe doit faire au moins 2 caractères." };
  }

  const group = await prisma.group.create({
    data: {
      name,
      description: description || null,
      inviteCode: newInviteCode(),
      ownerId: user.id,
      members: {
        create: { userId: user.id, tokens: STARTING_TOKENS },
      },
    },
  });

  redirect(`/g/${group.id}`);
}

export async function joinGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim();

  const group = await prisma.group.findUnique({ where: { inviteCode: code } });
  if (!group) {
    return { error: "Ce code d'invitation n'existe pas." };
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: user.id } },
  });

  if (!existing) {
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: user.id, tokens: STARTING_TOKENS },
    });
    await logActivity(group.id, `${user.name ?? "Un membre"} a rejoint le groupe.`);
  }

  redirect(`/g/${group.id}`);
}

export async function regenerateInviteCode(groupId: string) {
  const { isOwner } = await requireMembership(groupId);
  if (!isOwner) return;

  await prisma.group.update({
    where: { id: groupId },
    data: { inviteCode: newInviteCode() },
  });

  revalidatePath(`/g/${groupId}/settings`);
}

export async function updateDiscordWebhook(
  groupId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { isOwner } = await requireMembership(groupId);
  if (!isOwner) return { error: "Réservé au propriétaire du groupe." };

  const url = String(formData.get("webhookUrl") ?? "").trim();

  if (url && !url.startsWith("https://discord.com/api/webhooks/")) {
    return {
      error:
        "L'URL doit être un webhook Discord (https://discord.com/api/webhooks/…).",
    };
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { discordWebhookUrl: url || null },
  });

  revalidatePath(`/g/${groupId}/settings`);
  return null;
}

export async function leaveGroup(groupId: string) {
  const { user, isOwner } = await requireMembership(groupId);
  // The owner would orphan the group; they must delete it instead.
  if (isOwner) return;

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  await logActivity(groupId, `${user.name ?? "Un membre"} a quitté le groupe.`);

  redirect("/groups");
}
