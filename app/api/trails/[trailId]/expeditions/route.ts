import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { filterExpeditionsSchema } from "@/lib/zodSchemas";

export async function GET(
  req: NextRequest,
  { params }: { params: { trailId: string } }
) {
  const { searchParams } = new URL(req.url);
  const parsed = filterExpeditionsSchema.safeParse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid query", details: parsed.error.errors },
      { status: 400 }
    );
  }
  const { from, to, page, pageSize } = parsed.data;
  const where: any = {
    trailId: params.trailId,
    status: "published",
    endDate: { gte: new Date() },
  };
  if (from || to) {
    where.startDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  const [items, total] = await Promise.all([
    prisma.expedition.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { startDate: "asc" },
      include: {
        guide: { include: { user: true } },
        participants: { where: { paymentStatus: "approved" }, select: { id: true } },
      },
    }),
    prisma.expedition.count({ where }),
  ]);
  const result = items.map((e) => ({
    ...e,
    availableSpots: e.maxPeople - e.participants.length,
  }));
  return NextResponse.json({ items: result, total, page, pageSize });
}
