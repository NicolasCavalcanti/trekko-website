import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/zodSchemas";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const data = await req.json();
  const parsed = signupSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid data", details: parsed.error.errors },
      { status: 400 }
    );
  }

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

  const token = signToken({ sub: user.id, role: user.role });
  return NextResponse.json({ token, user }, { status: 201 });
}
