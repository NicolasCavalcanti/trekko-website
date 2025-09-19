import { Prisma } from '@prisma/client';

import { prisma } from '../../services/prisma';

export type AuditInput = {
  userId?: string | null;
  entity: string;
  entityId?: string | null;
  action: string;
  diff?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

const sanitizeDiff = (diff: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull => {
  if (diff === undefined || diff === null) {
    return Prisma.JsonNull;
  }

  try {
    return JSON.parse(JSON.stringify(diff)) as Prisma.InputJsonValue;
  } catch {
    return Prisma.JsonNull;
  }
};

export const audit = async (input: AuditInput): Promise<void> => {
  const { userId, entity, entityId, action, diff, ip, userAgent } = input;

  if (!entity || !action) {
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        entity,
        entityId: entityId ?? null,
        action,
        diff: sanitizeDiff(diff),
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    });
  } catch (error) {
    // Auditing must never block main operations. Log and continue.
    console.error('Failed to write audit log entry', error);
  }
};
