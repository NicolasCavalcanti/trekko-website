import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { mediaCreateSchema } from "@/lib/zodSchemas";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ["GUIDE", "ADMIN"]);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  const data = await req.json();
  const parsed = mediaCreateSchema.safeParse(data);
  if (!parsed.success)
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid data", details: parsed.error.errors },
      { status: 400 }
    );
  const media = await prisma.media.create({ data: parsed.data });
  return NextResponse.json(media, { status: 201 });
}
