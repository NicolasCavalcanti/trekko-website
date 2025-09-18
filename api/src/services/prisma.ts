import { PrismaClient } from '@prisma/client';

const prismaSingleton = () => {
  return new PrismaClient();
};

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? prismaSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type PrismaClientInstance = typeof prisma;
