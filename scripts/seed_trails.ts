import { prisma } from "../lib/prisma";

const SOURCE: Array<{
  name: string;
  city: string; state: string; regionOrPark: string;
  difficultyPt: "Fácil" | "Moderada" | "Difícil" | "Extrema";
  distanceKm: number;
  coverUrl: string;
}> = [
  {
    name: "Pico da Bandeira",
    city: "Alto Caparaó",
    state: "MG",
    regionOrPark: "Parque Nacional do Caparaó",
    difficultyPt: "Difícil",
    distanceKm: 14,
    coverUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
  },
  {
    name: "Pico dos Marins",
    city: "Piquete",
    state: "SP",
    regionOrPark: "Serra da Mantiqueira",
    difficultyPt: "Difícil",
    distanceKm: 12,
    coverUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
  },
  {
    name: "Pedra do Sino",
    city: "Teresópolis",
    state: "RJ",
    regionOrPark: "Parque Nacional da Serra dos Órgãos",
    difficultyPt: "Moderada",
    distanceKm: 8,
    coverUrl: "https://images.unsplash.com/photo-1464822759844-d150baec4ba5?w=400&h=300&fit=crop",
  },
  {
    name: "Pedra Azul",
    city: "Domingos Martins",
    state: "ES",
    regionOrPark: "Parque Estadual da Pedra Azul",
    difficultyPt: "Moderada",
    distanceKm: 6,
    coverUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
  },
  {
    name: "Cachoeira do Tabuleiro",
    city: "Conceição do Mato Dentro",
    state: "MG",
    regionOrPark: "Parque Estadual do Pico do Itambé",
    difficultyPt: "Fácil",
    distanceKm: 4,
    coverUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
  },
  {
    name: "Serra do Cipó",
    city: "Santana do Riacho",
    state: "MG",
    regionOrPark: "Parque Nacional da Serra do Cipó",
    difficultyPt: "Moderada",
    distanceKm: 15,
    coverUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
  },
  {
    name: "Pico das Agulhas Negras",
    city: "Itatiaia",
    state: "RJ",
    regionOrPark: "Parque Nacional de Itatiaia",
    difficultyPt: "Difícil",
    distanceKm: 10,
    coverUrl: "https://images.unsplash.com/photo-1464822759844-d150baec4ba5?w=400&h=300&fit=crop",
  },
  {
    name: "Pico do Itacolomi",
    city: "Ouro Preto",
    state: "MG",
    regionOrPark: "Parque Estadual do Itacolomi",
    difficultyPt: "Moderada",
    distanceKm: 5,
    coverUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
  },
  {
    name: "Pedra da Gávea",
    city: "Rio de Janeiro",
    state: "RJ",
    regionOrPark: "Parque Nacional da Tijuca",
    difficultyPt: "Difícil",
    distanceKm: 6,
    coverUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
  },
  {
    name: "Pico da Neblina",
    city: "São Gabriel da Cachoeira",
    state: "AM",
    regionOrPark: "Parque Nacional do Pico da Neblina",
    difficultyPt: "Extrema",
    distanceKm: 50,
    coverUrl: "https://images.unsplash.com/photo-1464822759844-d150baec4ba5?w=400&h=300&fit=crop",
  }
];

function mapDifficulty(pt: string) {
  const m: Record<string, string> = { "Fácil": "EASY", "Moderada": "MODERATE", "Difícil": "HARD", "Extrema": "EXTREME" };
  return m[pt] ?? "MODERATE";
}

export async function seedTrails() {
  for (const t of SOURCE) {
    const trail = await prisma.trail.upsert({
      where: {
        id:
          (
            await prisma.trail.findFirst({
              where: { name: t.name, city: t.city, state: t.state },
            })
          )?.id ?? "___none___",
      },
      update: {
        regionOrPark: t.regionOrPark,
        difficulty: mapDifficulty(t.difficultyPt) as any,
        distanceKm: t.distanceKm,
      },
      create: {
        name: t.name,
        state: t.state,
        city: t.city,
        regionOrPark: t.regionOrPark,
        distanceKm: t.distanceKm,
        elevationGainM: 0,
        difficulty: mapDifficulty(t.difficultyPt) as any,
        requiresGuide: false,
      },
    }).catch(async () => {
      const existing = await prisma.trail.findFirst({
        where: { name: t.name, city: t.city, state: t.state },
      });
      if (existing) return existing;
      return prisma.trail.create({
        data: {
          name: t.name,
          state: t.state,
          city: t.city,
          regionOrPark: t.regionOrPark,
          distanceKm: t.distanceKm,
          elevationGainM: 0,
          difficulty: mapDifficulty(t.difficultyPt) as any,
          requiresGuide: false,
        },
      });
    });

    await prisma.media.updateMany({
      where: { trailId: trail.id, isCover: true },
      data: { isCover: false },
    });

    await prisma.media.create({
      data: { trailId: trail.id, url: t.coverUrl, type: "image", isCover: true },
    });
  }
}

seedTrails()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
