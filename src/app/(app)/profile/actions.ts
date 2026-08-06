"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { saveUpload, UploadError } from "@/lib/uploads";

export type ActionState = { error: string } | null;

export async function updateProfile(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Le nom ne peut pas être vide." };
  }
  if (name.length > 50) {
    return { error: "Le nom est trop long (50 caractères maximum)." };
  }

  let image: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) {
      return { error: "La photo de profil doit être une image." };
    }
    try {
      image = await saveUpload(avatar);
    } catch (error) {
      if (error instanceof UploadError) return { error: error.message };
      throw error;
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name, ...(image && { image }) },
  });

  revalidatePath("/", "layout");
  return null;
}
