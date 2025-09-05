import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { reviewCreateSchema } from "@/lib/zodSchemas";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ["TREKKER", "GUIDE", "ADMIN"]);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  const data = await req.json();
  const parsed = reviewCreateSchema.safeParse(data);
  if (!parsed.success)
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid data", details: parsed.error.errors },
      { status: 400 }
    );
  const review = await prisma.review.create({
    data: { ...parsed.data, authorId: auth.user.sub },
  });
  return NextResponse.json(review, { status: 201 });
}
