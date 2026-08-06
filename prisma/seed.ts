/**
 * Production seed — data the app needs to function at all.
 *
 * Idempotent: safe to re-run on every deploy. Only touches the fixed reference
 * data (categories) and the bootstrap admin. Never creates fake users, groups
 * or achievements — that is what `fixtures.ts` is for, and it is dev-only.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/** The fixed category list — only platform admins may change it in-app. */
const CATEGORIES = [
  { name: "Sport", slug: "sport" },
  { name: "Social", slug: "social" },
  { name: "Créativité", slug: "creativite" },
  { name: "Nourriture", slug: "nourriture" },
  { name: "Voyage", slug: "voyage" },
  { name: "Absurde", slug: "absurde" },
];

async function main() {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: { name: category.name },
    });
  }
  console.log(`✓ ${CATEGORIES.length} catégories en place`);

  // Promotes an existing account to platform admin. The user must have signed
  // in through Discord at least once — we never fabricate credentials here.
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (adminEmail) {
    const user = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isPlatformAdmin: true },
      });
      console.log(`✓ ${adminEmail} est administrateur plateforme`);
    } else {
      console.warn(
        `! Aucun compte pour ${adminEmail} — connecte-toi via Discord puis relance le seed.`,
      );
    }
  } else {
    console.log(
      "· BOOTSTRAP_ADMIN_EMAIL non défini, aucun admin promu (voir .env.example)",
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
