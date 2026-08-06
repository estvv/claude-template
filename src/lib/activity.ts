import { prisma } from "@/lib/prisma";

/**
 * Records one plain-text line in the group's activity feed and mirrors it to
 * the group's Discord webhook when configured. Delivery is best-effort: a dead
 * webhook must never break the action that triggered the log.
 */
export async function logActivity(groupId: string, message: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { discordWebhookUrl: true },
  });

  let pushedToDiscord = false;
  if (group?.discordWebhookUrl) {
    pushedToDiscord = await pushToDiscord(group.discordWebhookUrl, message);
  }

  await prisma.activity.create({
    data: { groupId, message, pushedToDiscord },
  });
}

async function pushToDiscord(webhookUrl: string, message: string) {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
