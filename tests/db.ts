import { prisma } from "@/lib/prisma";
import { STARTING_TOKENS } from "@/lib/constants";
import { sessionState, type TestSessionUser } from "./mocks";

export { prisma };

/** Children before parents — SQLite enforces the foreign keys. */
export async function resetDb() {
  await prisma.wager.deleteMany();
  await prisma.betOutcome.deleteMany();
  await prisma.bet.deleteMany();
  await prisma.validationVote.deleteMany();
  await prisma.completion.deleteMany();
  await prisma.estimationVote.deleteMany();
  await prisma.message.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.achievementTemplate.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnect() {
  await prisma.$disconnect();
}

let counter = 0;
const unique = () => `${Date.now()}-${counter++}`;

export async function makeUser(
  overrides: { name?: string; isPlatformAdmin?: boolean } = {},
) {
  const id = unique();
  return prisma.user.create({
    data: {
      name: overrides.name ?? `User ${id}`,
      email: `user-${id}@test.local`,
      isPlatformAdmin: overrides.isPlatformAdmin ?? false,
    },
  });
}

export async function makeCategory(name = "Sport") {
  return prisma.category.create({
    data: { name, slug: `${name.toLowerCase()}-${unique()}` },
  });
}

export async function makeGroup(
  ownerId: string,
  options: { memberIds?: string[]; tokens?: number; webhook?: string } = {},
) {
  const tokens = options.tokens ?? STARTING_TOKENS;
  return prisma.group.create({
    data: {
      name: `Group ${unique()}`,
      inviteCode: `invite-${unique()}`,
      ownerId,
      discordWebhookUrl: options.webhook ?? null,
      members: {
        create: [
          { userId: ownerId, tokens },
          ...(options.memberIds ?? []).map((userId) => ({ userId, tokens })),
        ],
      },
    },
  });
}

export async function makeAchievement(
  input: {
    groupId: string;
    creatorId: string;
    categoryId: string;
    mode?: "OPEN" | "PERSONAL";
    status?: string;
    basePoints?: number | null;
    targetUserId?: string | null;
    deadlineHours?: number;
    estimationClosesInHours?: number | null;
    title?: string;
  },
) {
  return prisma.achievement.create({
    data: {
      groupId: input.groupId,
      creatorId: input.creatorId,
      categoryId: input.categoryId,
      title: input.title ?? `Achievement ${unique()}`,
      description: "",
      mode: input.mode ?? "OPEN",
      status: input.status ?? "ACTIVE",
      basePoints: input.basePoints === undefined ? 50 : input.basePoints,
      targetUserId: input.targetUserId ?? null,
      deadline: hoursFromNow(input.deadlineHours ?? 48),
      estimationClosesAt:
        input.estimationClosesInHours === undefined ||
        input.estimationClosesInHours === null
          ? null
          : hoursFromNow(input.estimationClosesInHours),
    },
  });
}

export async function makeBet(input: {
  achievementId: string;
  creatorId: string;
  type: "YES_NO" | "WHO";
  candidateIds?: string[];
}) {
  return prisma.bet.create({
    data: {
      achievementId: input.achievementId,
      creatorId: input.creatorId,
      type: input.type,
      outcomes: {
        create:
          input.type === "YES_NO"
            ? [{ label: "Oui" }, { label: "Non" }]
            : (input.candidateIds ?? []).map((candidateId, index) => ({
                label: `Candidat ${index}`,
                candidateId,
              })),
      },
    },
    include: { outcomes: true },
  });
}

/** Places a stake the way the action does: debit now, credit at resolution. */
export async function stake(
  groupId: string,
  betId: string,
  outcomeId: string,
  userId: string,
  amount: number,
) {
  await prisma.wager.create({
    data: { betId, outcomeId, userId, amount },
  });
  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId } },
    data: { tokens: { decrement: amount } },
  });
}

export async function tokensOf(groupId: string, userId: string) {
  const member = await prisma.groupMember.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId } },
  });
  return member.tokens;
}

export async function karmaOf(groupId: string, userId: string) {
  const member = await prisma.groupMember.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId } },
  });
  return member.karma;
}

export function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/** Makes the given user the caller for subsequent action invocations. */
export function actAs(user: {
  id: string;
  name?: string | null;
  isPlatformAdmin?: boolean;
}) {
  const session: TestSessionUser = {
    id: user.id,
    name: user.name ?? null,
    email: null,
    image: null,
    isPlatformAdmin: user.isPlatformAdmin ?? false,
  };
  sessionState.user = session;
  return session;
}

export function actAsGuest() {
  sessionState.user = null;
}

/** Runs an action expected to `redirect()`, returning the target URL. */
export async function captureRedirect(run: () => Promise<unknown>) {
  const { RedirectError } = await import("./mocks");
  try {
    await run();
  } catch (error) {
    if (error instanceof RedirectError) return error.url;
    throw error;
  }
  throw new Error("Expected a redirect, but the action returned normally.");
}

export function formData(fields: Record<string, string | File>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.append(key, value);
  }
  return data;
}
