import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { trailCreateSchema } from "@/lib/zodSchemas";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const where = {
    state: searchParams.get("state") || undefined,
    city: searchParams.get("city") || undefined,
    name: searchParams.get("name")
      ? { contains: searchParams.get("name")!, mode: "insensitive" }
      : undefined,
    difficulty: searchParams.get("difficulty") || undefined,
  };
  const [items, total] = await Promise.all([
    prisma.trail.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.trail.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ["ADMIN"]);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  const data = await req.json();
  const parsed = trailCreateSchema.safeParse(data);
  if (!parsed.success)
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid data", details: parsed.error.errors },
      { status: 400 }
    );
  const trail = await prisma.trail.create({ data: parsed.data });
  return NextResponse.json(trail, { status: 201 });
}
