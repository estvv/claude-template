import { Settings } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KarmaBadge, TokenBadge } from "@/components/ui-patterns";
import { InviteSection } from "./invite-section";
import { WebhookForm } from "./webhook-form";

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { group, isOwner } = await requireMembership(groupId);
  if (!isOwner) notFound();

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={Settings}
        title="Paramètres"
        description={`Réglages de « ${group.name} »`}
      />

      <div className="space-y-4">
        <Card className="gap-0 border-[var(--border-light)] p-5 shadow-none">
          <p className="text-lg font-semibold">Inviter des membres</p>
          <InviteSection groupId={groupId} inviteCode={group.inviteCode} />
        </Card>

        <Card className="gap-0 border-[var(--border-light)] p-5 shadow-none">
          <p className="text-lg font-semibold">Log d&apos;activité Discord</p>
          <WebhookForm
            groupId={groupId}
            current={group.discordWebhookUrl ?? ""}
          />
        </Card>

        <Card className="gap-0 border-[var(--border-light)] p-5 shadow-none">
          <p className="mb-4 text-lg font-semibold">
            Membres ({members.length})
          </p>
          <ul className="divide-y divide-[var(--border-light)]">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={member.user.image ?? undefined} alt="" />
                  <AvatarFallback className="rounded-lg text-[10px]">
                    {(member.user.name ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {member.user.name ?? "Membre"}
                  {member.userId === group.ownerId && (
                    <span className="ml-2 rounded-sm border border-[var(--border-light)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                      OWNER
                    </span>
                  )}
                </span>
                <KarmaBadge value={member.karma} />
                <TokenBadge value={member.tokens} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
