import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const UF_MAP: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export async function GET(_req: NextRequest) {
  const grouped = await prisma.trail.groupBy({
    by: ["state"],
    _count: { _all: true },
  });

  const countMap = new Map(grouped.map((g) => [g.state, g._count._all]));

  const perState = await Promise.all(
    Object.entries(UF_MAP).map(async ([uf, name]) => {
      const first = countMap.has(uf)
        ? await prisma.trail.findFirst({
            where: { state: uf },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            include: { media: { where: { isCover: true }, take: 1 } },
          })
        : null;

      return {
        state: uf,
        stateName: name,
        count: countMap.get(uf) ?? 0,
        trailName: first?.name ?? null,
        trailCity: first?.city ?? null,
        trailSlug: first?.slug ?? null,
        coverImageUrl: first?.media?.[0]?.url ?? null,
      };
    })
  );

  perState.sort((a, b) => a.stateName.localeCompare(b.stateName, "pt-BR"));

  return NextResponse.json({ items: perState });
}

