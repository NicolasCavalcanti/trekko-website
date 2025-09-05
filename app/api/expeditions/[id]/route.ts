import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { expeditionUpdateSchema } from "@/lib/zodSchemas";

async function ensureGuideOwnership(expeditionId: string, user: { sub: string; role: string }) {
  if (user.role !== "GUIDE") return true;
  const expedition = await prisma.expedition.findUnique({ where: { id: expeditionId } });
  return expedition && expedition.guideId === user.sub;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const expedition = await prisma.expedition.findUnique({ where: { id: params.id } });
  if (!expedition)
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Expedition not found" },
      { status: 404 }
    );
  return NextResponse.json(expedition);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(req, ["GUIDE", "ADMIN"]);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  if (!(await ensureGuideOwnership(params.id, auth.user)))
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Insufficient role" },
      { status: 403 }
    );
  const data = await req.json();
  const parsed = expeditionUpdateSchema.safeParse(data);
  if (!parsed.success)
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid data", details: parsed.error.errors },
      { status: 400 }
    );
  try {
    const expedition = await prisma.expedition.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json(expedition);
  } catch {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Expedition not found" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(req, ["GUIDE", "ADMIN"]);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  if (!(await ensureGuideOwnership(params.id, auth.user)))
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Insufficient role" },
      { status: 403 }
    );
  try {
    await prisma.expedition.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Expedition not found" },
      { status: 404 }
    );
  }
}
