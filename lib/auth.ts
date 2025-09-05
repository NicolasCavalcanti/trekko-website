import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const SECRET = process.env.JWT_SECRET!;

export function signToken(payload: { sub: string; role: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    return jwt.verify(token, SECRET) as { sub: string; role: string };
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest, roles?: string[]) {
  const user = getUser(req);
  if (!user) return { ok: false, status: 401, body: { code: "UNAUTHENTICATED", message: "Login required" } };
  if (roles && !roles.includes(user.role)) return { ok: false, status: 403, body: { code: "FORBIDDEN", message: "Insufficient role" } };
  return { ok: true, user };
}
