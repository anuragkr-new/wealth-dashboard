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
  for (const c of defaults) {
    await prisma.assetCategory.upsert({
      where: { name: c.name },
      create: c,
      update: { icon: c.icon, growthRate: c.growthRate },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
