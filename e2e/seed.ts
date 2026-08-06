/**
 * Builds the E2E database and writes the seeded ids to `e2e/.world.json`.
 *
 * Run as its own tsx process (see global-setup.ts): Playwright loads its setup
 * file as CommonJS, which cannot import the ESM Prisma client.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { encode } from "next-auth/jwt";
import { STARTING_TOKENS } from "../src/lib/constants";
import { E2E_AUTH_SECRET } from "./env";

const E2E_DB_URL = `file:${path.join(process.cwd(), "prisma", "e2e.db")}`;
const hours = (n: number) => new Date(Date.now() + n * 3_600_000);

/**
 * Every id is fixed so the seed can be replayed between spec files without
 * invalidating the ids the specs already hold.
 */
const ID = {
  sport: "e2e-cat-sport",
  social: "e2e-cat-social",
  owner: "e2e-user-owner",
  member: "e2e-user-member",
  outsider: "e2e-user-outsider",
  group: "e2e-group",
  race: "e2e-ach-race",
  estimating: "e2e-ach-estimating",
  personal: "e2e-ach-personal",
  proof: "e2e-completion-pending",
  bet: "e2e-bet-race",
  message: "e2e-message",
} as const;

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: E2E_DB_URL }),
});

async function main() {
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

  const sport = await prisma.category.create({
    data: { id: ID.sport, name: "Sport", slug: "sport" },
  });
  await prisma.category.create({
    data: { id: ID.social, name: "Social", slug: "social" },
  });

  const owner = await prisma.user.create({
    data: {
      id: ID.owner,
      name: "Paul",
      email: "paul@e2e.test",
      isPlatformAdmin: true,
    },
  });
  const member = await prisma.user.create({
    data: { id: ID.member, name: "Lea", email: "lea@e2e.test" },
  });
  const outsider = await prisma.user.create({
    data: { id: ID.outsider, name: "Zoe", email: "zoe@e2e.test" },
  });

  const group = await prisma.group.create({
    data: {
      id: ID.group,
      name: "Les Potos",
      description: "Groupe E2E",
      inviteCode: "e2e-invite",
      ownerId: owner.id,
      members: {
        create: [
          { userId: owner.id, tokens: STARTING_TOKENS, karma: 120 },
          { userId: member.id, tokens: STARTING_TOKENS, karma: 60 },
        ],
      },
    },
  });

  // Open competition: a live "who wins" bet plus a proof awaiting Paul's vote.
  const race = await prisma.achievement.create({
    data: {
      id: ID.race,
      groupId: group.id,
      creatorId: owner.id,
      categoryId: sport.id,
      title: "Courir 10 km",
      description: "D'une traite, capture obligatoire.",
      mode: "OPEN",
      status: "ACTIVE",
      basePoints: 50,
      deadline: hours(72),
    },
  });
  const pendingProof = await prisma.completion.create({
    data: {
      id: ID.proof,
      achievementId: race.id,
      userId: member.id,
      proofUrl: "/icons/icon-512.png",
      note: "Fait ce matin",
      voteClosesAt: hours(24),
    },
  });
  const raceBet = await prisma.bet.create({
    data: {
      id: ID.bet,
      achievementId: race.id,
      creatorId: owner.id,
      type: "WHO",
      outcomes: {
        create: [
          { label: "Paul", candidateId: owner.id },
          { label: "Lea", candidateId: member.id },
        ],
      },
    },
  });

  // Member-created, still inside its estimation window.
  const estimating = await prisma.achievement.create({
    data: {
      id: ID.estimating,
      groupId: group.id,
      creatorId: member.id,
      categoryId: sport.id,
      title: "Monter 100 etages",
      description: "A pied.",
      mode: "OPEN",
      status: "ESTIMATING",
      basePoints: null,
      estimationClosesAt: hours(12),
      deadline: hours(240),
    },
  });

  // Personal challenge targeting Paul, with no bet opened yet.
  const personal = await prisma.achievement.create({
    data: {
      id: ID.personal,
      groupId: group.id,
      creatorId: member.id,
      categoryId: sport.id,
      title: "Paul va nager 1 km",
      description: "Avant la fin du mois.",
      mode: "PERSONAL",
      targetUserId: owner.id,
      status: "ACTIVE",
      basePoints: 35,
      deadline: hours(96),
    },
  });

  await prisma.message.create({
    data: {
      id: ID.message,
      achievementId: race.id,
      userId: member.id,
      body: "Qui se lance ?",
    },
  });

  // Auth.js sessions are JWT-based (see src/auth.ts), so standing in for a
  // completed sign-in means encoding a cookie the same way, not writing a
  // Session row — mirrors the `jwt`/`session` callbacks' shape.
  function sessionFor(user: {
    id: string;
    name: string | null;
    email: string | null;
    isPlatformAdmin: boolean;
  }) {
    return encode({
      token: {
        sub: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      secret: E2E_AUTH_SECRET,
      salt: "authjs.session-token",
    });
  }

  const world = {
    groupId: group.id,
    inviteCode: group.inviteCode,
    raceId: race.id,
    estimatingId: estimating.id,
    personalId: personal.id,
    pendingProofId: pendingProof.id,
    raceBetId: raceBet.id,
    ownerId: owner.id,
    memberId: member.id,
    tokens: {
      owner: await sessionFor(owner),
      member: await sessionFor(member),
      outsider: await sessionFor(outsider),
    },
  };

  writeFileSync(
    path.join(process.cwd(), "e2e", ".world.json"),
    JSON.stringify(world, null, 2),
  );
  console.log("✓ base E2E prête");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect())
  // `encode()` from next-auth/jwt leaves a handle open that never drains on
  // its own, so this process would otherwise hang forever after a clean run —
  // exiting explicitly is what lets the `execFileSync` callers return.
  .then(() => process.exit(0));
