import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaults = [
  { name: "Cash", icon: "💵", growthRate: 0 },
  { name: "Savings", icon: "🏦", growthRate: 4 },
  { name: "Stocks", icon: "📈", growthRate: 14 },
  { name: "Mutual Funds", icon: "📊", growthRate: 12 },
  { name: "Gold", icon: "🥇", growthRate: 8 },
  { name: "PPF", icon: "🏛️", growthRate: 7.1 },
];

async function main() {
  const email = process.env.SEED_FOR_EMAIL?.trim();
  if (!email) {
    console.log(
      "Seed skipped: set SEED_FOR_EMAIL to the Google account email (must have signed in once so User exists)."
    );
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.warn(
      `No User row for "${email}". Sign in with Google once, then run npm run db:seed again.`
    );
    return;
  }

  for (const c of defaults) {
    await prisma.assetCategory.upsert({
      where: {
        userId_name: { userId: user.id, name: c.name },
      },
      create: {
        userId: user.id,
        name: c.name,
        icon: c.icon,
        growthRate: c.growthRate,
      },
      update: { icon: c.icon, growthRate: c.growthRate },
    });
  }
  console.log(`Seeded default categories for ${email}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
