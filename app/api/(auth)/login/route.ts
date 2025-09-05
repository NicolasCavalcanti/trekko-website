import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { email, password } = data;
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid data" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Invalid credentials" },
      { status: 401 }
    );
  }

  const token = signToken({ sub: user.id, role: user.role });
  return NextResponse.json({ token, user });
}
