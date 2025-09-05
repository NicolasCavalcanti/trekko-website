import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { bookingUpdateSchema } from "@/lib/zodSchemas";

function canAccess(user: { sub: string; role: string }, booking: any) {
  if (user.role === "ADMIN") return true;
  if (user.role === "TREKKER" && booking.trekkerId === user.sub) return true;
  if (user.role === "GUIDE" && booking.expedition.guideId === user.sub) return true;
  return false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { expedition: { select: { guideId: true } } },
  });
  if (!booking)
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Booking not found" },
      { status: 404 }
    );
  if (!canAccess(auth.user, booking))
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Insufficient role" },
      { status: 403 }
    );
  return NextResponse.json(booking);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  const existing = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { expedition: { select: { guideId: true } } },
  });
  if (!existing)
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Booking not found" },
      { status: 404 }
    );
  if (!canAccess(auth.user, existing))
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Insufficient role" },
      { status: 403 }
    );
  const data = await req.json();
  const parsed = bookingUpdateSchema.safeParse(data);
  if (!parsed.success)
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid data", details: parsed.error.errors },
      { status: 400 }
    );
  const booking = await prisma.booking.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json(booking);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { expedition: { select: { guideId: true } } },
  });
  if (!booking)
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Booking not found" },
      { status: 404 }
    );
  if (!canAccess(auth.user, booking))
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Insufficient role" },
      { status: 403 }
    );
  await prisma.booking.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
