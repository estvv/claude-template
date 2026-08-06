import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isPlatformAdmin) notFound();
  return user;
}

/**
 * Loads the group along with the caller's membership. Groups are invite-only,
 * so a non-member gets a 404 rather than a 403 — no reason to confirm that a
 * group id exists to someone who wasn't invited.
 */
export async function requireMembership(groupId: string) {
  const user = await requireUser();

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
    include: { group: true },
  });

  if (!membership) notFound();

  return {
    user,
    membership,
    group: membership.group,
    isOwner: membership.group.ownerId === user.id,
  };
}

/**
 * Group context for a page: membership check plus the lazy tick that applies
 * any vote window or deadline that lapsed since the last page load.
 */
export async function loadGroupContext(groupId: string) {
  const context = await requireMembership(groupId);
  const { runGroupTick } = await import("@/lib/tick");
  await runGroupTick(groupId);
  return context;
}

/** Author, group owner, and platform admins may remove content. */
export function canModerate({
  authorId,
  groupOwnerId,
  user,
}: {
  authorId: string;
  groupOwnerId: string;
  user: { id: string; isPlatformAdmin: boolean };
}) {
  return (
    user.id === authorId || user.id === groupOwnerId || user.isPlatformAdmin
  );
}
