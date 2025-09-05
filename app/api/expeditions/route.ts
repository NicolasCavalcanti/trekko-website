import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { expeditionCreateSchema } from "@/lib/zodSchemas";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);

  const where: any = {
    trailId: searchParams.get("trailId") || undefined,
    guideId: searchParams.get("guideId") || undefined,
    status: searchParams.get("status") || undefined,
    ...(searchParams.get("from") || searchParams.get("to")
      ? {
          startDate: {
            gte: searchParams.get("from")
              ? new Date(searchParams.get("from")!)
              : undefined,
            lte: searchParams.get("to")
              ? new Date(searchParams.get("to")!)
              : undefined,
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.expedition.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { startDate: "asc" },
    }),
    prisma.expedition.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ["GUIDE", "ADMIN"]);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  const data = await req.json();
  const parsed = expeditionCreateSchema.safeParse(data);
  if (!parsed.success)
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid data", details: parsed.error.errors },
      { status: 400 }
    );

  const guideId =
    auth.user.role === "GUIDE"
      ? auth.user.sub
      : (data.guideId ?? auth.user.sub);
  const expedition = await prisma.expedition.create({
    data: { ...parsed.data, guideId },
  });
  return NextResponse.json(expedition, { status: 201 });
}
