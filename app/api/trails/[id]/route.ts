import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { trailUpdateSchema } from "@/lib/zodSchemas";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const trail = await prisma.trail.findUnique({ where: { id: params.id } });
  if (!trail)
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Trail not found" },
      { status: 404 }
    );
  return NextResponse.json(trail);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(req, ["ADMIN"]);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  const data = await req.json();
  const parsed = trailUpdateSchema.safeParse(data);
  if (!parsed.success)
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid data", details: parsed.error.errors },
      { status: 400 }
    );
  try {
    const trail = await prisma.trail.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json(trail);
  } catch {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Trail not found" },
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
    await prisma.trail.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Trail not found" },
      { status: 404 }
    );
  }
}
