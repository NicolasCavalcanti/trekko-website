import {
  Prisma,
  ExpeditionStatus,
  ReservationStatus,
  type Expedition,
  type Reservation,
  type User,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { HttpError } from '../../middlewares/error';
import { prisma, type PrismaClientInstance } from '../../services/prisma';
import { audit } from '../audit/audit.service';
import type { ActorContext, PaginationMeta, RequestContext } from '../users/user.service';
import {
  type CreateAdminReservationBody,
  type ListAdminReservationsQuery,
  type UpdateAdminReservationBody,
} from './reservation.schemas';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.CONFIRMED,
];

const BOOKABLE_EXPEDITION_STATUSES: Set<ExpeditionStatus> = new Set([
  ExpeditionStatus.PUBLISHED,
  ExpeditionStatus.SCHEDULED,
  ExpeditionStatus.IN_PROGRESS,
]);

type ReservationListRecord = Reservation & {
  user: Pick<User, 'id' | 'name' | 'email'>;
  expedition: Pick<
    Expedition,
    'id' | 'title' | 'status' | 'startDate' | 'endDate' | 'priceCents' | 'currency'
  >;
};

type ReservationDetailRecord = Reservation & {
  user: Pick<User, 'id' | 'name' | 'email'>;
  expedition: Pick<
    Expedition,
    'id' | 'title' | 'status' | 'startDate' | 'endDate' | 'priceCents' | 'currency' | 'maxParticipants'
  >;
};

export type ReservationSummary = {
  id: string;
  code: string;
  status: ReservationStatus;
  headcount: number;
  totalCents: number;
  feeCents: number;
  discountCents: number;
  currency: string;
  bookedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  expedition: {
    id: string;
    title: string;
    status: ExpeditionStatus;
    startDate: string;
    endDate: string;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type ReservationDetail = ReservationSummary & {
  notes: string | null;
  internalNotes: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  cancellationReason: string | null;
};

const normalizeString = (input: string | null | undefined): string | null => {
  if (input === undefined || input === null) {
    return null;
  }

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const sanitizeOptionalText = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return normalizeString(value);
};

const buildPaginationMeta = (totalItems: number, page: number, pageSize: number): PaginationMeta => {
  const totalPages = pageSize === 0 ? 0 : Math.ceil(totalItems / pageSize);

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

const normalizeStatusFilter = (
  status: string | string[] | undefined,
): ReservationStatus[] | undefined => {
  if (!status) {
    return undefined;
  }

  const toStatus = (value: string): ReservationStatus => {
    const upper = value.trim().toUpperCase();
    if (!upper) {
      throw new HttpError(400, 'INVALID_STATUS', 'Status filter cannot be empty');
    }

    if (!(upper in ReservationStatus)) {
      throw new HttpError(400, 'INVALID_STATUS', `Invalid reservation status: ${value}`);
    }

    return ReservationStatus[upper as keyof typeof ReservationStatus];
  };

  if (Array.isArray(status)) {
    return status.map(toStatus);
  }

  return [toStatus(status)];
};

const toReservationSummary = (reservation: ReservationListRecord): ReservationSummary => ({
  id: reservation.id,
  code: reservation.code,
  status: reservation.status,
  headcount: reservation.headcount,
  totalCents: reservation.totalCents,
  feeCents: reservation.feeCents,
  discountCents: reservation.discountCents,
  currency: reservation.currency,
  bookedAt: reservation.bookedAt.toISOString(),
  confirmedAt: reservation.confirmedAt ? reservation.confirmedAt.toISOString() : null,
  cancelledAt: reservation.cancelledAt ? reservation.cancelledAt.toISOString() : null,
  expedition: {
    id: reservation.expedition.id,
    title: reservation.expedition.title,
    status: reservation.expedition.status,
    startDate: reservation.expedition.startDate.toISOString(),
    endDate: reservation.expedition.endDate.toISOString(),
  },
  user: {
    id: reservation.user.id,
    name: reservation.user.name ?? null,
    email: reservation.user.email,
  },
});

const toReservationDetail = (reservation: ReservationDetailRecord): ReservationDetail => ({
  ...toReservationSummary(reservation),
  notes: reservation.notes ?? null,
  internalNotes: reservation.internalNotes ?? null,
  emergencyContactName: reservation.emergencyContactName ?? null,
  emergencyContactPhone: reservation.emergencyContactPhone ?? null,
  cancellationReason: reservation.cancellationReason ?? null,
});

const generateReservationCode = (): string => {
  return `RSV-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
};

const parseReservationStatus = (
  status: CreateAdminReservationBody['status'] | UpdateAdminReservationBody['status'],
  fallback: ReservationStatus,
): ReservationStatus => {
  if (!status) {
    return fallback;
  }

  if (!(status in ReservationStatus)) {
    throw new HttpError(400, 'INVALID_STATUS', `Invalid reservation status: ${status}`);
  }

  return ReservationStatus[status as keyof typeof ReservationStatus];
};

const sanitizeCancellationReason = (reason: string | null | undefined): string | null => {
  const sanitized = sanitizeOptionalText(reason);
  return sanitized ?? null;
};

const updateExpeditionAvailability = async (
  tx: Prisma.TransactionClient,
  expeditionId: string,
): Promise<void> => {
  const aggregate = await tx.reservation.aggregate({
    where: {
      expeditionId,
      status: { in: ACTIVE_RESERVATION_STATUSES },
    },
    _sum: { headcount: true },
  });

  const expedition = await tx.expedition.findUnique({
    where: { id: expeditionId },
    select: { maxParticipants: true, status: true },
  });

  if (!expedition) {
    throw new HttpError(404, 'EXPEDITION_NOT_FOUND', 'Expedition not found');
  }

  const reserved = aggregate._sum.headcount ?? 0;
  const shouldForceZero =
    expedition.status === ExpeditionStatus.CANCELLED ||
    expedition.status === ExpeditionStatus.COMPLETED;
  const available = shouldForceZero
    ? 0
    : Math.max(expedition.maxParticipants - reserved, 0);

  await tx.expedition.update({
    where: { id: expeditionId },
    data: { availableSpots: available },
  });
};

const calculateTotalCents = (pricePerPersonCents: number, headcount: number, feeCents: number, discountCents: number): number => {
  const baseAmount = pricePerPersonCents * headcount;
  const total = baseAmount + feeCents - discountCents;
  return total < 0 ? 0 : total;
};

export class AdminReservationService {
  constructor(private readonly prismaClient: PrismaClientInstance = prisma) {}

  async listReservations(
    params: ListAdminReservationsQuery,
  ): Promise<{ reservations: ReservationSummary[]; pagination: PaginationMeta }> {
    const page = Math.max(1, params.page ?? 1);
    const rawPageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const pageSize = Math.max(1, Math.min(rawPageSize, MAX_PAGE_SIZE));
    const skip = (page - 1) * pageSize;

    const statusFilter = normalizeStatusFilter(params.status);

    const where: Prisma.ReservationWhereInput = {
      deletedAt: null,
    };

    if (statusFilter && statusFilter.length > 0) {
      where.status = { in: statusFilter };
    }

    if (params.expeditionId) {
      where.expeditionId = params.expeditionId;
    }

    if (params.userId) {
      where.userId = params.userId;
    }

    const [reservations, totalItems] = await this.prismaClient.$transaction([
      this.prismaClient.reservation.findMany({
        where,
        orderBy: { bookedAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, name: true, email: true } },
          expedition: {
            select: {
              id: true,
              title: true,
              status: true,
              startDate: true,
              endDate: true,
              priceCents: true,
              currency: true,
            },
          },
        },
      }),
      this.prismaClient.reservation.count({ where }),
    ]);

    const summaries = reservations.map(toReservationSummary);
    const pagination = buildPaginationMeta(totalItems, page, pageSize);

    return { reservations: summaries, pagination };
  }

  async createReservation(
    actor: ActorContext,
    body: CreateAdminReservationBody,
    context: RequestContext,
  ): Promise<ReservationDetail> {
    const headcount = body.headcount ?? 1;
    if (headcount <= 0) {
      throw new HttpError(400, 'INVALID_HEADCOUNT', 'Headcount must be greater than zero');
    }

    return this.prismaClient.$transaction(async (tx) => {
      const expedition = await tx.expedition.findFirst({
        where: { id: body.expeditionId, deletedAt: null },
        select: {
          id: true,
          status: true,
          maxParticipants: true,
          priceCents: true,
          currency: true,
        },
      });

      if (!expedition) {
        throw new HttpError(404, 'EXPEDITION_NOT_FOUND', 'Expedition not found');
      }

      if (!BOOKABLE_EXPEDITION_STATUSES.has(expedition.status)) {
        throw new HttpError(
          400,
          'EXPEDITION_NOT_BOOKABLE',
          `Reservations cannot be created when expedition status is ${expedition.status}`,
        );
      }

      const user = await tx.user.findUnique({
        where: { id: body.userId },
        select: { id: true },
      });

      if (!user) {
        throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
      }

      const aggregate = await tx.reservation.aggregate({
        where: { expeditionId: body.expeditionId, status: { in: ACTIVE_RESERVATION_STATUSES } },
        _sum: { headcount: true },
      });

      const reserved = aggregate._sum.headcount ?? 0;
      if (reserved + headcount > expedition.maxParticipants) {
        throw new HttpError(409, 'EXPEDITION_FULL', 'Expedition capacity has been reached');
      }

      const status = parseReservationStatus(body.status, ReservationStatus.PENDING);
      if (status === ReservationStatus.CANCELLED || status === ReservationStatus.EXPIRED) {
        throw new HttpError(
          400,
          'INVALID_STATUS',
          'Reservations cannot be created directly with CANCELLED or EXPIRED status',
        );
      }

      const feeCents = body.feeCents ?? 0;
      const discountCents = body.discountCents ?? 0;
      const totalCents = calculateTotalCents(expedition.priceCents, headcount, feeCents, discountCents);
      const now = new Date();

      const reservation = await tx.reservation.create({
        data: {
          code: generateReservationCode(),
          expeditionId: expedition.id,
          userId: body.userId,
          status,
          headcount,
          totalCents,
          feeCents,
          discountCents,
          currency: expedition.currency,
          emergencyContactName: sanitizeOptionalText(body.emergencyContactName) ?? null,
          emergencyContactPhone: sanitizeOptionalText(body.emergencyContactPhone) ?? null,
          notes: sanitizeOptionalText(body.notes) ?? null,
          internalNotes: sanitizeOptionalText(body.internalNotes) ?? null,
          bookedAt: now,
          confirmedAt: status === ReservationStatus.CONFIRMED ? now : null,
          cancelledAt: null,
          cancellationReason: null,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          expedition: {
            select: {
              id: true,
              title: true,
              status: true,
              startDate: true,
              endDate: true,
              priceCents: true,
              currency: true,
              maxParticipants: true,
            },
          },
        },
      });

      await updateExpeditionAvailability(tx, expedition.id);

      await audit({
        userId: actor.actorId,
        entity: 'reservation',
        entityId: reservation.id,
        action: 'CREATE',
        diff: {
          expeditionId: reservation.expeditionId,
          userId: reservation.userId,
          status: reservation.status,
          headcount: reservation.headcount,
          totalCents: reservation.totalCents,
        },
        ip: context.ip,
        userAgent: context.userAgent,
      });

      return toReservationDetail(reservation);
    });
  }

  async updateReservation(
    actor: ActorContext,
    id: string,
    body: UpdateAdminReservationBody,
    context: RequestContext,
  ): Promise<ReservationDetail> {
    return this.prismaClient.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { id, deletedAt: null },
        include: {
          user: { select: { id: true, name: true, email: true } },
          expedition: {
            select: {
              id: true,
              title: true,
              status: true,
              startDate: true,
              endDate: true,
              priceCents: true,
              currency: true,
              maxParticipants: true,
            },
          },
        },
      });

      if (!reservation) {
        throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Reservation not found');
      }

      const newHeadcount = body.headcount ?? reservation.headcount;
      if (newHeadcount <= 0) {
        throw new HttpError(400, 'INVALID_HEADCOUNT', 'Headcount must be greater than zero');
      }

      const newStatus = parseReservationStatus(body.status, reservation.status);

      const wasActive = ACTIVE_RESERVATION_STATUSES.includes(reservation.status);
      const willBeActive = ACTIVE_RESERVATION_STATUSES.includes(newStatus);

      const aggregate = await tx.reservation.aggregate({
        where: {
          expeditionId: reservation.expeditionId,
          status: { in: ACTIVE_RESERVATION_STATUSES },
        },
        _sum: { headcount: true },
      });

      const currentReserved = aggregate._sum.headcount ?? 0;
      const reservedWithoutCurrent = wasActive ? currentReserved - reservation.headcount : currentReserved;
      const projectedReserved = willBeActive ? reservedWithoutCurrent + newHeadcount : reservedWithoutCurrent;

      if (projectedReserved > reservation.expedition.maxParticipants) {
        throw new HttpError(409, 'EXPEDITION_FULL', 'Expedition capacity has been reached');
      }

      const feeCents = reservation.feeCents;
      const discountCents = reservation.discountCents;
      const totalCents = calculateTotalCents(
        reservation.expedition.priceCents,
        newHeadcount,
        feeCents,
        discountCents,
      );

      const now = new Date();
      const updateData: Prisma.ReservationUpdateInput = {
        headcount: newHeadcount,
        totalCents,
        status: newStatus,
      };

      if (body.notes !== undefined) {
        updateData.notes = sanitizeOptionalText(body.notes) ?? null;
      }

      if (body.internalNotes !== undefined) {
        updateData.internalNotes = sanitizeOptionalText(body.internalNotes) ?? null;
      }

      if (body.emergencyContactName !== undefined) {
        updateData.emergencyContactName = sanitizeOptionalText(body.emergencyContactName) ?? null;
      }

      if (body.emergencyContactPhone !== undefined) {
        updateData.emergencyContactPhone = sanitizeOptionalText(body.emergencyContactPhone) ?? null;
      }

      if (newStatus === ReservationStatus.CONFIRMED) {
        updateData.confirmedAt = now;
        updateData.cancelledAt = null;
        updateData.cancellationReason = null;
      } else if (reservation.status === ReservationStatus.CONFIRMED) {
        updateData.confirmedAt = null;
      }

      if (newStatus === ReservationStatus.CANCELLED) {
        updateData.cancelledAt = now;
        updateData.cancellationReason = sanitizeCancellationReason(
          body.cancellationReason ?? reservation.cancellationReason,
        );
      } else if (body.cancellationReason !== undefined) {
        updateData.cancellationReason = sanitizeCancellationReason(body.cancellationReason);
      }

      if (newStatus !== ReservationStatus.CANCELLED && reservation.status === ReservationStatus.CANCELLED) {
        updateData.cancelledAt = null;
        if (body.cancellationReason === undefined) {
          updateData.cancellationReason = null;
        }
      }

      const updated = await tx.reservation.update({
        where: { id: reservation.id },
        data: updateData,
        include: {
          user: { select: { id: true, name: true, email: true } },
          expedition: {
            select: {
              id: true,
              title: true,
              status: true,
              startDate: true,
              endDate: true,
              priceCents: true,
              currency: true,
              maxParticipants: true,
            },
          },
        },
      });

      await updateExpeditionAvailability(tx, reservation.expeditionId);

      await audit({
        userId: actor.actorId,
        entity: 'reservation',
        entityId: updated.id,
        action: 'UPDATE',
        diff: {
          previousStatus: reservation.status,
          newStatus,
          headcount: newHeadcount,
          notesChanged: body.notes !== undefined,
          internalNotesChanged: body.internalNotes !== undefined,
          emergencyContactUpdated:
            body.emergencyContactName !== undefined || body.emergencyContactPhone !== undefined,
        },
        ip: context.ip,
        userAgent: context.userAgent,
      });

      return toReservationDetail(updated);
    });
  }
}

export const adminReservationService = new AdminReservationService();
