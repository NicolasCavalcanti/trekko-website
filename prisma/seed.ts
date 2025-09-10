import { prisma } from "../lib/prisma";
import { seedTrails } from "../scripts/seed_trails";

async function main() {
  await seedTrails();
  await prisma.user.upsert({
    where: { email: "nicolas_cavalcanti@hotmail.com" },
    update: { role: "admin" },
    create: {
      name: "Nicolas Cavalcanti",
      email: "nicolas_cavalcanti@hotmail.com",
      avatarUrl: null,
      role: "admin",
    },
  });
  // create example guide
  const user = await prisma.user.upsert({
    where: { email: "guide@example.com" },
    update: {},
    create: {
      name: "Guia Exemplo",
      email: "guide@example.com",
      avatarUrl: null,
      role: "guide",
    },
  });
  await prisma.guide.upsert({
    where: { id: user.id },
    update: { isVerified: true },
    create: {
      id: user.id,
      cadastur: "000000000",
      bio: "Guia de exemplo",
      isVerified: true,
    },
  });
  const trail = await prisma.trail.findFirst();
  if (trail) {
    await prisma.expedition.createMany({
      data: [
        {
          trailId: trail.id,
          guideId: user.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          priceCents: 10000,
          maxPeople: 10,
          description: "Expedição de exemplo",
          status: "published",
        },
        {
          trailId: trail.id,
          guideId: user.id,
          startDate: new Date(Date.now() + 86400000 * 7),
          endDate: new Date(Date.now() + 86400000 * 8),
          priceCents: 12000,
          maxPeople: 8,
          description: "Expedição rascunho",
          status: "draft",
        },
      ],
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
