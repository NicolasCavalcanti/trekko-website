import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { signupSchema } from "@/lib/zodSchemas";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const q = searchParams.get("q");
  const where: any = {
    role: searchParams.get("role") || undefined,
    OR: q
      ? [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { cadastur: { contains: q, mode: "insensitive" } },
        ]
      : undefined,
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ["ADMIN"]);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  const data = await req.json();
  const parsed = signupSchema.safeParse(data);
  if (!parsed.success)
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid data", details: parsed.error.errors },
      { status: 400 }
    );
  const { name, email, password, role, cadastur } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists)
    return NextResponse.json(
      { code: "CONFLICT", message: "Email already in use" },
      { status: 409 }
    );
  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10), role, cadastur },
  });
  return NextResponse.json(user, { status: 201 });
}
