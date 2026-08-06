"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { Prisma } from "@/generated/prisma/client";

export type ActionState = { error: string } | null;

async function signInWithCredentials(username: string, password: string) {
  try {
    await signIn("credentials", { username, password, redirectTo: "/groups" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Identifiants invalides." };
    }
    throw error;
  }
  return null;
}

export async function login(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return signInWithCredentials(username, password);
}

export async function register(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (username.length < 3) {
    return { error: "Le nom d'utilisateur doit faire au moins 3 caractères." };
  }
  if (password.length < 8) {
    return { error: "Le mot de passe doit faire au moins 8 caractères." };
  }

  try {
    await prisma.user.create({
      data: { username, name: username, passwordHash: await hashPassword(password) },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Ce nom d'utilisateur est déjà pris." };
    }
    throw error;
  }

  return signInWithCredentials(username, password);
}
