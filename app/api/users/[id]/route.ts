import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { userUpdateSchema } from "@/lib/zodSchemas";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user)
    return NextResponse.json(
      { code: "NOT_FOUND", message: "User not found" },
      { status: 404 }
    );
  return NextResponse.json(user);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  if (auth.user.role !== "ADMIN" && auth.user.sub !== params.id)
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Insufficient role" },
      { status: 403 }
    );
  const data = await req.json();
  const parsed = userUpdateSchema.safeParse(data);
  if (!parsed.success)
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid data", details: parsed.error.errors },
      { status: 400 }
    );
  const { password, ...rest } = parsed.data;
  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "User not found" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(req, ["ADMIN"]);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  try {
    await prisma.user.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "User not found" },
      { status: 404 }
    );
  }
}
