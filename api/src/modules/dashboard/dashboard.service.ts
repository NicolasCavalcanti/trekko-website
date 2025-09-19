import { ExpeditionStatus, GuideVerificationStatus, PaymentStatus, ReservationStatus } from '@prisma/client';

import { prisma, type PrismaClientInstance } from '../../services/prisma';

const OPEN_EXPEDITION_STATUSES: ExpeditionStatus[] = [
  ExpeditionStatus.PUBLISHED,
  ExpeditionStatus.SCHEDULED,
  ExpeditionStatus.IN_PROGRESS,
];

const centsToBRL = (value: number): number => {
  if (!Number.isFinite(value) || value === 0) {
    return 0;
  }

  return Number((value / 100).toFixed(2));
};

export type RevenueMetrics = {
  grossCents: number;
  grossBRL: number;
  netCents: number;
  netBRL: number;
};

export type ReservationMetrics = Record<ReservationStatus, number>;

export type DashboardMetrics = {
  totals: {
    users: number;
    trails: number;
  };
  guides: {
    verified: number;
    pending: number;
  };
  expeditions: {
    open: number;
  };
  reservations: ReservationMetrics;
  revenue: RevenueMetrics;
};

export type DashboardEvent = {
  id: string;
  entity: string;
  entityId: string | null;
  action: string;
  diff: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

const buildReservationMetrics = (groups: Array<{ status: ReservationStatus; _count: number }>): ReservationMetrics => {
  const metrics: ReservationMetrics = {
    [ReservationStatus.PENDING]: 0,
    [ReservationStatus.CONFIRMED]: 0,
    [ReservationStatus.CANCELLED]: 0,
    [ReservationStatus.WAITLISTED]: 0,
    [ReservationStatus.EXPIRED]: 0,
  };

  for (const group of groups) {
    metrics[group.status] = group._count;
  }

  return metrics;
};

export class AdminDashboardService {
  private readonly prismaClient: PrismaClientInstance;

  constructor(prismaClient: PrismaClientInstance = prisma) {
    this.prismaClient = prismaClient;
  }

  async getMetrics(): Promise<DashboardMetrics> {
    const [
      userCount,
      verifiedGuides,
      pendingGuides,
      trailCount,
      openExpeditions,
      reservationGroups,
      paymentAggregate,
    ] = await Promise.all([
      this.prismaClient.user.count({ where: { deletedAt: null } }),
      this.prismaClient.guideProfile.count({
        where: { deletedAt: null, verificationStatus: GuideVerificationStatus.VERIFIED },
      }),
      this.prismaClient.guideProfile.count({
        where: { deletedAt: null, verificationStatus: GuideVerificationStatus.PENDING },
      }),
      this.prismaClient.trail.count({ where: { deletedAt: null } }),
      this.prismaClient.expedition.count({
        where: { deletedAt: null, status: { in: OPEN_EXPEDITION_STATUSES } },
      }),
      this.prismaClient.reservation.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { deletedAt: null },
      }),
      this.prismaClient.payment.aggregate({
        where: {
          deletedAt: null,
          status: { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] },
        },
        _sum: {
          amountCents: true,
          netAmountCents: true,
          feeCents: true,
        },
      }),
    ]);

    const reservationMetrics = buildReservationMetrics(
      reservationGroups.map((group) => ({ status: group.status, _count: group._count.status })),
    );

    const grossCents = paymentAggregate._sum.amountCents ?? 0;
    const netCents =
      paymentAggregate._sum.netAmountCents ??
      Math.max((paymentAggregate._sum.amountCents ?? 0) - (paymentAggregate._sum.feeCents ?? 0), 0);

    return {
      totals: {
        users: userCount,
        trails: trailCount,
      },
      guides: {
        verified: verifiedGuides,
        pending: pendingGuides,
      },
      expeditions: {
        open: openExpeditions,
      },
      reservations: reservationMetrics,
      revenue: {
        grossCents,
        grossBRL: centsToBRL(grossCents),
        netCents,
        netBRL: centsToBRL(netCents),
      },
    } satisfies DashboardMetrics;
  }

  async getRecentEvents(limit = 20): Promise<DashboardEvent[]> {
    const take = Math.min(Math.max(limit, 1), 100);

    const events = await this.prismaClient.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return events.map((event) => ({
      id: event.id,
      entity: event.entity,
      entityId: event.entityId ?? null,
      action: event.action,
      diff: event.diff ?? null,
      ip: event.ip ?? null,
      userAgent: event.userAgent ?? null,
      createdAt: event.createdAt.toISOString(),
      user: event.user
        ? {
            id: event.user.id,
            name: event.user.name ?? null,
            email: event.user.email,
          }
        : null,
    }));
  }
}

export const adminDashboardService = new AdminDashboardService();

