import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { bookingCreateSchema } from "@/lib/zodSchemas";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const where: any = {
    trekkerId: searchParams.get("trekkerId") || undefined,
    expeditionId: searchParams.get("expeditionId") || undefined,
    status: searchParams.get("status") || undefined,
  };
  if (auth.user.role === "TREKKER") {
    where.trekkerId = auth.user.sub;
  } else if (auth.user.role === "GUIDE") {
    where.expedition = { guideId: auth.user.sub };
  }
  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ["TREKKER", "ADMIN", "GUIDE"]);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const data = await req.json();
  const parsed = bookingCreateSchema.safeParse(data);
  if (!parsed.success)
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid data", details: parsed.error.errors },
      { status: 400 }
    );

  const expedition = await prisma.expedition.findUnique({
    where: { id: parsed.data.expeditionId },
  });
  if (!expedition)
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Expedition not found" },
      { status: 404 }
    );

  const totalCents = expedition.pricePerPersonCents * parsed.data.headcount;

  const current = await prisma.booking.aggregate({
    _sum: { headcount: true },
    where: {
      expeditionId: expedition.id,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });
  const occupied = current._sum.headcount ?? 0;
  if (occupied + parsed.data.headcount > expedition.maxPeople) {
    return NextResponse.json(
      { code: "CAPACITY_EXCEEDED", message: "No seats available" },
      { status: 409 }
    );
  }

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        expeditionId: expedition.id,
        trekkerId: auth.user.sub,
        headcount: parsed.data.headcount,
        totalCents,
        status: "PENDING",
        notes: parsed.data.notes,
      },
    });
    await tx.expedition.update({
      where: { id: expedition.id },
      data: { bookedCount: { increment: parsed.data.headcount } },
    });
    return created;
  });

  return NextResponse.json(booking, { status: 201 });
}
