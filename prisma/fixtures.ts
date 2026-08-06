/**
 * Development fixtures — fake data to click through the app locally.
 *
 * NOT idempotent and NOT for production: it wipes the domain tables and
 * recreates a group covering every state worth looking at (estimation running,
 * proof awaiting validation, validated, rejected, resolved bet, open bet).
 *
 *   npm run db:fixtures
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { STARTING_TOKENS } from "../src/lib/constants";
import { hashPassword } from "../src/lib/password";

if (process.env.NODE_ENV === "production") {
  console.error("Refus : les fixtures ne doivent jamais tourner en production.");
  process.exit(1);
}

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const hours = (n: number) => new Date(Date.now() + n * 60 * 60 * 1000);

// Same password for all four — this is throwaway dev data, not a security
// boundary. Printed again at the end so it doesn't have to be remembered.
const FIXTURE_PASSWORD = "password123";

const PEOPLE = [
  { name: "Paul", username: "paul", email: "paul@example.test" },
  { name: "Léa", username: "lea", email: "lea@example.test" },
  { name: "Marco", username: "marco", email: "marco@example.test" },
  { name: "Nina", username: "nina", email: "nina@example.test" },
];

async function main() {
  // Order matters: children before parents, since SQLite FKs are enforced.
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
  await prisma.user.deleteMany({
    where: { email: { in: PEOPLE.map((p) => p.email) } },
  });
  console.log("✓ tables du domaine vidées");

  const categories = await prisma.category.findMany();
  if (categories.length === 0) {
    console.error("Lance d'abord `npm run db:seed` (aucune catégorie).");
    process.exit(1);
  }
  const category = (slug: string) =>
    (categories.find((c) => c.slug === slug) ?? categories[0]).id;

  const passwordHash = await hashPassword(FIXTURE_PASSWORD);
  const users = [];
  for (const [index, person] of PEOPLE.entries()) {
    users.push(
      await prisma.user.create({
        data: {
          name: person.name,
          username: person.username,
          email: person.email,
          passwordHash,
          // Paul doubles as the platform admin so /admin is reachable in dev.
          isPlatformAdmin: index === 0,
        },
      }),
    );
  }
  const [paul, lea, marco, nina] = users;

  const group = await prisma.group.create({
    data: {
      name: "Les Potos",
      description: "Le groupe de test rempli par les fixtures.",
      inviteCode: "dev-invite",
      ownerId: paul.id,
      members: {
        create: users.map((user, index) => ({
          userId: user.id,
          // Spread karma so the leaderboard isn't flat.
          karma: [120, 90, 45, 0][index],
          tokens: STARTING_TOKENS,
        })),
      },
    },
  });
  console.log(`✓ groupe « ${group.name} » (code: dev-invite)`);

  await prisma.achievementTemplate.createMany({
    data: [
      {
        title: "Courir 10 km",
        description: "D'une traite, montre la capture de ton app de running.",
        mode: "OPEN",
        points: 50,
        durationDays: 14,
        categoryId: category("sport"),
      },
      {
        title: "Cuisiner un plat de zéro",
        description: "Photo du résultat, les plats surgelés ne comptent pas.",
        mode: "OPEN",
        points: 30,
        durationDays: 7,
        categoryId: category("nourriture"),
      },
    ],
  });

  // 1. Member-created, estimation vote still running.
  const estimating = await prisma.achievement.create({
    data: {
      groupId: group.id,
      creatorId: lea.id,
      categoryId: category("absurde"),
      title: "Porter un costume une journée entière au bureau",
      description: "Sans rien dire à personne. Photo à l'appui.",
      mode: "OPEN",
      status: "ESTIMATING",
      estimationClosesAt: hours(12),
      deadline: days(10),
    },
  });
  await prisma.estimationVote.createMany({
    data: [
      { achievementId: estimating.id, userId: paul.id, points: 40 },
      { achievementId: estimating.id, userId: marco.id, points: 60 },
    ],
  });

  // 2. Open competition, one validated completion + one awaiting the vote.
  const race = await prisma.achievement.create({
    data: {
      groupId: group.id,
      creatorId: paul.id,
      categoryId: category("sport"),
      title: "Courir 10 km",
      description: "D'une traite. Capture de l'app de running obligatoire.",
      mode: "OPEN",
      status: "ACTIVE",
      basePoints: 50,
      deadline: days(6),
    },
  });
  await prisma.completion.create({
    data: {
      achievementId: race.id,
      userId: lea.id,
      proofUrl: "/icons/icon-512.png",
      note: "1h02, mort mais content.",
      status: "VALIDATED",
      awardedPoints: 50,
      rank: 1,
      voteClosesAt: hours(-4),
      resolvedAt: hours(-4),
    },
  });
  const pendingCompletion = await prisma.completion.create({
    data: {
      achievementId: race.id,
      userId: marco.id,
      proofUrl: "/icons/icon-512.png",
      note: "Un peu plus lent, mais fait !",
      status: "PENDING",
      voteClosesAt: hours(30),
    },
  });
  await prisma.validationVote.create({
    data: {
      completionId: pendingCompletion.id,
      userId: paul.id,
      decision: "VALIDATE",
      points: 45,
    },
  });

  // The race also carries an open "who finishes first" bet.
  const raceBet = await prisma.bet.create({
    data: {
      achievementId: race.id,
      creatorId: paul.id,
      type: "WHO",
      outcomes: {
        create: users.map((user) => ({
          label: user.name!,
          candidateId: user.id,
        })),
      },
    },
    include: { outcomes: true },
  });
  const onLea = raceBet.outcomes.find((o) => o.candidateId === lea.id)!;
  const onMarco = raceBet.outcomes.find((o) => o.candidateId === marco.id)!;
  await prisma.wager.createMany({
    data: [
      { betId: raceBet.id, outcomeId: onLea.id, userId: paul.id, amount: 30 },
      { betId: raceBet.id, outcomeId: onMarco.id, userId: nina.id, amount: 20 },
    ],
  });
  await prisma.groupMember.update({
    where: { groupId_userId: { groupId: group.id, userId: paul.id } },
    data: { tokens: { decrement: 30 } },
  });
  await prisma.groupMember.update({
    where: { groupId_userId: { groupId: group.id, userId: nina.id } },
    data: { tokens: { decrement: 20 } },
  });

  // 3. Personal challenge with a yes/no bet, still running.
  const personal = await prisma.achievement.create({
    data: {
      groupId: group.id,
      creatorId: paul.id,
      categoryId: category("social"),
      title: "Marco va parler à un inconnu dans le train",
      description: "Une vraie conversation, pas juste bonjour.",
      mode: "PERSONAL",
      targetUserId: marco.id,
      status: "ACTIVE",
      basePoints: 35,
      deadline: days(3),
    },
  });
  const personalBet = await prisma.bet.create({
    data: {
      achievementId: personal.id,
      creatorId: lea.id,
      type: "YES_NO",
      outcomes: { create: [{ label: "Oui" }, { label: "Non" }] },
    },
    include: { outcomes: true },
  });
  const yes = personalBet.outcomes.find((o) => o.label === "Oui")!;
  await prisma.wager.create({
    data: {
      betId: personalBet.id,
      outcomeId: yes.id,
      userId: lea.id,
      amount: 15,
    },
  });
  await prisma.groupMember.update({
    where: { groupId_userId: { groupId: group.id, userId: lea.id } },
    data: { tokens: { decrement: 15 } },
  });

  // 4. A rejected proof, so that state is visible too.
  const rejected = await prisma.achievement.create({
    data: {
      groupId: group.id,
      creatorId: nina.id,
      categoryId: category("creativite"),
      title: "Dessiner le portrait d'un membre du groupe",
      description: "À la main, pas de filtre IA.",
      mode: "OPEN",
      status: "ACTIVE",
      basePoints: 25,
      deadline: days(8),
    },
  });
  const rejectedCompletion = await prisma.completion.create({
    data: {
      achievementId: rejected.id,
      userId: nina.id,
      proofUrl: "/icons/icon-512.png",
      status: "REJECTED",
      voteClosesAt: hours(-2),
      resolvedAt: hours(-2),
    },
  });
  await prisma.validationVote.createMany({
    data: [
      {
        completionId: rejectedCompletion.id,
        userId: paul.id,
        decision: "REJECT",
      },
      { completionId: rejectedCompletion.id, userId: lea.id, decision: "REJECT" },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        achievementId: race.id,
        userId: nina.id,
        body: "Léa est intouchable sur celui-là 😅",
      },
      {
        achievementId: race.id,
        userId: marco.id,
        body: "Laissez-moi une chance quand même.",
      },
      {
        achievementId: personal.id,
        userId: paul.id,
        body: "J'ai hâte de voir ça.",
      },
    ],
  });

  await prisma.activity.createMany({
    data: [
      { groupId: group.id, message: "Léa a validé « Courir 10 km » (1er) et gagne 50 karma." },
      { groupId: group.id, message: "Marco a soumis une preuve pour « Courir 10 km » — à valider." },
      { groupId: group.id, message: "Léa a ouvert un pari sur « Marco va parler à un inconnu dans le train »." },
    ],
  });

  console.log("✓ 4 utilisateurs, 4 achievements, 2 paris, 3 messages");
  console.log(
    `\nComptes de test, déjà membres du groupe (mot de passe : \`${FIXTURE_PASSWORD}\`) :`,
  );
  for (const person of PEOPLE) {
    console.log(`  ${person.username}`);
  }
  console.log(
    "\nOu crée un compte séparé et rejoins-les avec le code `dev-invite`.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
