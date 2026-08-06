import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { STARTING_TOKENS } from "@/lib/constants";

/**
 * Invite links are the only way into a group. Hitting one while logged in
 * joins immediately; `requireUser` bounces guests through Discord first.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await requireUser();

  const group = await prisma.group.findUnique({ where: { inviteCode: code } });
  if (!group) notFound();

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: user.id } },
  });

  if (!existing) {
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: user.id, tokens: STARTING_TOKENS },
    });
    await logActivity(
      group.id,
      `${user.name ?? "Un membre"} a rejoint le groupe.`,
    );
  }

  redirect(`/g/${group.id}`);
}
