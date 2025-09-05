import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function ufToName(uf: string) {
  const map: Record<string, string> = {
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
  return map[uf] ?? uf;
}

export async function GET(_req: NextRequest) {
  const grouped = await prisma.trail.groupBy({
    by: ["state"],
    _count: { _all: true },
  });

  const perState = await Promise.all(
    grouped.map(async (g) => {
      const first = await prisma.trail.findFirst({
        where: { state: g.state },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { media: { where: { isCover: true }, take: 1 } },
      });

      return {
        state: g.state,
        stateName: ufToName(g.state),
        count: g._count._all,
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

