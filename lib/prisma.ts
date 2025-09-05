import { PrismaClient } from "@prisma/client";
export const prisma = (globalThis as any).__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") (globalThis as any).__prisma = prisma;
