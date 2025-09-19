import { Prisma, PaymentMethod, PaymentProvider, PaymentStatus, ReservationStatus } from '@prisma/client';

import { HttpError } from '../../middlewares/error';
import { prisma, type PrismaClientInstance } from '../../services/prisma';
import { PaymentsService, type PaymentMetadata } from '../../services/payments';
import { audit } from '../audit/audit.service';
import type { ActorContext, RequestContext } from '../users/user.service';
import {
  type CapturePaymentBody,
  type CapturePaymentParams,
  type ListAdminPaymentsQuery,
  type RefundPaymentBody,
  type RefundPaymentParams,
} from './payment.schemas';

const DEFAULT_COMMISSION_BASIS_POINTS = 300;
const PAYMENT_CAPTURE_LOCKED_STATUSES: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.AUTHORIZED];

const resolveCommissionBasisPoints = (): number => {
  const raw = process.env.PAYMENTS_COMMISSION_BPS;

  if (!raw) {
    return DEFAULT_COMMISSION_BASIS_POINTS;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return DEFAULT_COMMISSION_BASIS_POINTS;
  }

  return parsed;
};

const centsToBRL = (value: number): number => {
  if (!Number.isFinite(value) || value === 0) {
    return 0;
  }

  return Number((value / 100).toFixed(2));
};

const prepareMetadata = (
  ...sources: Array<Record<string, unknown> | undefined>
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined => {
  const aggregate: Record<string, unknown> = {};

  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }

    for (const [key, value] of Object.entries(source)) {
      aggregate[key] = value;
    }
  }

  if (Object.keys(aggregate).length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(aggregate)) as Prisma.InputJsonValue;
  } catch {
    return Prisma.JsonNull;
  }
};

type PaymentRecord = Prisma.PaymentGetPayload<{
  include: {
    reservation: {
      select: {
        id: true;
        code: true;
        status: true;
        headcount: true;
        totalCents: true;
        currency: true;
        user: { select: { id: true; name: true; email: true } };
      };
    };
    refunds: true;
  };
}>;

export type PaymentRefundSummary = {
  id: string;
  amountCents: number;
  status: PaymentStatus;
  processedAt: string | null;
  createdAt: string;
  reason: string | null;
};

export type PaymentReservationSummary = {
  id: string;
  code: string;
  status: ReservationStatus;
  headcount: number;
  totalCents: number;
  currency: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type PaymentSummary = {
  id: string;
  provider: PaymentProvider;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  feeCents: number;
  netAmountCents: number;
  netAmountBRL: number;
  commissionBasisPoints: number;
  currency: string;
  transactionId: string | null;
  externalReference: string | null;
  paidAt: string | null;
  capturedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  reservation: PaymentReservationSummary;
  refunds: PaymentRefundSummary[];
};

const toPaymentSummary = (payment: PaymentRecord): PaymentSummary => {
  const netAmountCents = payment.netAmountCents ?? Math.max(payment.amountCents - payment.feeCents, 0);
  const commissionBasisPoints =
    payment.amountCents > 0 ? Math.round((payment.feeCents * 10000) / payment.amountCents) : 0;

  return {
    id: payment.id,
    provider: payment.provider,
    method: payment.method,
    status: payment.status,
    amountCents: payment.amountCents,
    feeCents: payment.feeCents,
    netAmountCents,
    netAmountBRL: centsToBRL(netAmountCents),
    commissionBasisPoints,
    currency: payment.currency,
    transactionId: payment.transactionId ?? null,
    externalReference: payment.externalReference ?? null,
    paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    capturedAt: payment.capturedAt ? payment.capturedAt.toISOString() : null,
    cancelledAt: payment.cancelledAt ? payment.cancelledAt.toISOString() : null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    reservation: {
      id: payment.reservation.id,
      code: payment.reservation.code,
      status: payment.reservation.status,
      headcount: payment.reservation.headcount,
      totalCents: payment.reservation.totalCents,
      currency: payment.reservation.currency,
      user: {
        id: payment.reservation.user.id,
        name: payment.reservation.user.name ?? null,
        email: payment.reservation.user.email,
      },
    },
    refunds: payment.refunds
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((refund) => ({
        id: refund.id,
        amountCents: refund.amountCents,
        status: refund.status,
        processedAt: refund.processedAt ? refund.processedAt.toISOString() : null,
        createdAt: refund.createdAt.toISOString(),
        reason: refund.reason ?? null,
      })),
  } satisfies PaymentSummary;
};

const normalizeProvider = (provider?: string): PaymentProvider => {
  if (!provider) {
    return PaymentProvider.MERCADO_PAGO;
  }

  const upper = provider.trim().toUpperCase();
  if (!(upper in PaymentProvider)) {
    throw new HttpError(400, 'INVALID_PROVIDER', `Unsupported payment provider: ${provider}`);
  }

  return PaymentProvider[upper as keyof typeof PaymentProvider];
};

const normalizeMethod = (method?: string): PaymentMethod => {
  if (!method) {
    return PaymentMethod.PIX;
  }

  const upper = method.trim().toUpperCase();
  if (!(upper in PaymentMethod)) {
    throw new HttpError(400, 'INVALID_PAYMENT_METHOD', `Unsupported payment method: ${method}`);
  }

  return PaymentMethod[upper as keyof typeof PaymentMethod];
};

const extractMetadata = (metadata: PaymentMetadata | undefined, extra: Record<string, unknown>) => {
  return prepareMetadata(
    metadata,
    Object.keys(extra).length > 0 ? extra : undefined,
  );
};

export class AdminPaymentService {
  private readonly prismaClient: PrismaClientInstance;

  private readonly gateway: PaymentsService;

  constructor(prismaClient: PrismaClientInstance = prisma, commissionBasisPoints?: number) {
    this.prismaClient = prismaClient;
    const resolvedCommission =
      commissionBasisPoints ?? resolveCommissionBasisPoints();

    this.gateway = new PaymentsService({ commissionBasisPoints: resolvedCommission });
  }

  async listPayments(query: ListAdminPaymentsQuery): Promise<PaymentSummary[]> {
    const statusFilter = query.status?.map((status) => {
      const key = status as keyof typeof PaymentStatus;
      return PaymentStatus[key];
    });

    const payments = await this.prismaClient.payment.findMany({
      where: {
        deletedAt: null,
        ...(statusFilter ? { status: { in: statusFilter } } : {}),
      },
      include: {
        reservation: {
          select: {
            id: true,
            code: true,
            status: true,
            headcount: true,
            totalCents: true,
            currency: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        refunds: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((payment) => toPaymentSummary(payment as PaymentRecord));
  }

  async capturePayment(
    actor: ActorContext,
    params: CapturePaymentParams,
    body: CapturePaymentBody,
    context: RequestContext,
  ): Promise<PaymentSummary> {
    const provider = normalizeProvider(body.provider);
    const method = normalizeMethod(body.method);

    const payment = await this.prismaClient.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { id: params.reservationId, deletedAt: null },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (!reservation) {
        throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Reservation not found');
      }

      if (reservation.status === ReservationStatus.CANCELLED) {
        throw new HttpError(400, 'RESERVATION_CANCELLED', 'Cannot capture payment for a cancelled reservation');
      }

      const existingCaptured = await tx.payment.findFirst({
        where: {
          reservationId: reservation.id,
          deletedAt: null,
          status: { in: PAYMENT_CAPTURE_LOCKED_STATUSES },
        },
      });

      if (existingCaptured) {
        throw new HttpError(409, 'PAYMENT_ALREADY_CAPTURED', 'Payment has already been captured for this reservation');
      }

      const captureResult = await this.gateway.capture({
        provider,
        amountCents: reservation.totalCents,
        currency: reservation.currency,
        metadata: body.metadata,
      });

      const now = new Date();

      const metadata = extractMetadata(body.metadata, {
        commissionBasisPoints: captureResult.commissionBasisPoints,
        netAmountBRL: captureResult.netAmountBRL,
        providerResponse: captureResult.rawResponse,
      });

      const existingPayment = await tx.payment.findFirst({
        where: { reservationId: reservation.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      if (!captureResult.approved) {
        const failureMetadata = extractMetadata(body.metadata, {
          errorCode: captureResult.errorCode ?? 'UNKNOWN_ERROR',
          errorMessage: captureResult.errorMessage ?? 'Payment capture failed',
          providerResponse: captureResult.rawResponse,
        });

        const failedPayment = existingPayment
          ? await tx.payment.update({
              where: { id: existingPayment.id },
              data: {
                provider,
                method,
                status: PaymentStatus.FAILED,
                amountCents: reservation.totalCents,
                feeCents: 0,
                netAmountCents: 0,
                currency: reservation.currency,
                transactionId: captureResult.transactionId,
                externalReference: reservation.code,
                paidAt: null,
                capturedAt: null,
                cancelledAt: null,
                metadata: failureMetadata,
              },
            })
          : await tx.payment.create({
              data: {
                reservationId: reservation.id,
                provider,
                method,
                status: PaymentStatus.FAILED,
                amountCents: reservation.totalCents,
                feeCents: 0,
                netAmountCents: 0,
                currency: reservation.currency,
                transactionId: captureResult.transactionId,
                externalReference: reservation.code,
                metadata: failureMetadata,
              },
            });

        await audit({
          userId: actor.actorId,
          entity: 'payment',
          entityId: failedPayment.id,
          action: 'CAPTURE_FAILED',
          diff: {
            provider,
            method,
            reservationId: reservation.id,
            amountCents: reservation.totalCents,
            errorCode: captureResult.errorCode ?? 'UNKNOWN_ERROR',
          },
          ip: context.ip,
          userAgent: context.userAgent,
        });

        throw new HttpError(
          422,
          'PAYMENT_CAPTURE_FAILED',
          captureResult.errorMessage ?? 'Payment capture was declined',
        );
      }

      const savedPayment = existingPayment
        ? await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              provider,
              method,
              status: PaymentStatus.PAID,
              amountCents: reservation.totalCents,
              feeCents: captureResult.feeCents,
              netAmountCents: captureResult.netAmountCents,
              currency: reservation.currency,
              transactionId: captureResult.transactionId,
              externalReference: reservation.code,
              metadata,
              paidAt: now,
              capturedAt: now,
              cancelledAt: null,
            },
          })
        : await tx.payment.create({
            data: {
              reservationId: reservation.id,
              provider,
              method,
              status: PaymentStatus.PAID,
              amountCents: reservation.totalCents,
              feeCents: captureResult.feeCents,
              netAmountCents: captureResult.netAmountCents,
              currency: reservation.currency,
              transactionId: captureResult.transactionId,
              externalReference: reservation.code,
              metadata,
              paidAt: now,
              capturedAt: now,
            },
          });

      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: ReservationStatus.CONFIRMED,
          confirmedAt: reservation.confirmedAt ?? now,
          cancelledAt: null,
          cancellationReason: null,
        },
      });

      const persistedPayment = await tx.payment.findUnique({
        where: { id: savedPayment.id },
        include: {
          reservation: {
            select: {
              id: true,
              code: true,
              status: true,
              headcount: true,
              totalCents: true,
              currency: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
          refunds: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!persistedPayment) {
        throw new HttpError(500, 'PAYMENT_NOT_PERSISTED', 'Failed to load payment after capture');
      }

      await audit({
        userId: actor.actorId,
        entity: 'payment',
        entityId: persistedPayment.id,
        action: 'CAPTURE',
        diff: {
          provider,
          method,
          reservationId: reservation.id,
          amountCents: reservation.totalCents,
          feeCents: captureResult.feeCents,
          netAmountCents: captureResult.netAmountCents,
        },
        ip: context.ip,
        userAgent: context.userAgent,
      });

      return persistedPayment as PaymentRecord;
    });

    return toPaymentSummary(payment);
  }

  async refundPayment(
    actor: ActorContext,
    params: RefundPaymentParams,
    body: RefundPaymentBody,
    context: RequestContext,
  ): Promise<PaymentSummary> {
    const payment = await this.prismaClient.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { id: params.reservationId, deletedAt: null },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (!reservation) {
        throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Reservation not found');
      }

      const paymentToRefund = await tx.payment.findFirst({
        where: {
          reservationId: reservation.id,
          deletedAt: null,
          status: PaymentStatus.PAID,
        },
        orderBy: { createdAt: 'desc' },
        include: { refunds: true },
      });

      if (!paymentToRefund) {
        throw new HttpError(409, 'PAYMENT_NOT_CAPTURED', 'No captured payment available for refund');
      }

      const amountToRefund = body.amountCents ?? paymentToRefund.amountCents;

      if (!Number.isFinite(amountToRefund) || amountToRefund <= 0) {
        throw new HttpError(400, 'INVALID_REFUND_AMOUNT', 'Refund amount must be greater than zero');
      }

      if (amountToRefund !== paymentToRefund.amountCents) {
        throw new HttpError(400, 'PARTIAL_REFUND_UNSUPPORTED', 'Partial refunds are not supported at this time');
      }

      const refundResult = await this.gateway.refund({
        provider: paymentToRefund.provider,
        paymentId: paymentToRefund.id,
        amountCents: amountToRefund,
        currency: paymentToRefund.currency,
        metadata: body.metadata,
        reason: body.reason ?? null,
      });

      const now = new Date();

      if (!refundResult.approved) {
        await tx.paymentRefund.create({
          data: {
            paymentId: paymentToRefund.id,
            amountCents: amountToRefund,
            reason: body.reason ?? null,
            status: PaymentStatus.FAILED,
            processedAt: now,
          },
        });

        await audit({
          userId: actor.actorId,
          entity: 'payment',
          entityId: paymentToRefund.id,
          action: 'REFUND_FAILED',
          diff: {
            amountCents: amountToRefund,
            provider: paymentToRefund.provider,
            reservationId: reservation.id,
            errorCode: refundResult.errorCode ?? 'UNKNOWN_ERROR',
          },
          ip: context.ip,
          userAgent: context.userAgent,
        });

        throw new HttpError(
          422,
          'PAYMENT_REFUND_FAILED',
          refundResult.errorMessage ?? 'Refund could not be processed',
        );
      }

      await tx.paymentRefund.create({
        data: {
          paymentId: paymentToRefund.id,
          amountCents: amountToRefund,
          reason: body.reason ?? null,
          status: PaymentStatus.REFUNDED,
          processedAt: now,
        },
      });

      const metadata = extractMetadata(body.metadata, {
        lastRefund: {
          amountCents: amountToRefund,
          netAmountBRL: refundResult.netAmountBRL,
          providerResponse: refundResult.rawResponse,
          reason: body.reason ?? null,
        },
      });

      await tx.payment.update({
        where: { id: paymentToRefund.id },
        data: {
          status: PaymentStatus.REFUNDED,
          cancelledAt: now,
          netAmountCents: 0,
          metadata,
        },
      });

      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: ReservationStatus.CANCELLED,
          cancelledAt: now,
          cancellationReason: body.reason ?? reservation.cancellationReason ?? null,
        },
      });

      const persistedPayment = await tx.payment.findUnique({
        where: { id: paymentToRefund.id },
        include: {
          reservation: {
            select: {
              id: true,
              code: true,
              status: true,
              headcount: true,
              totalCents: true,
              currency: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
          refunds: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!persistedPayment) {
        throw new HttpError(500, 'PAYMENT_NOT_PERSISTED', 'Failed to load payment after refund');
      }

      await audit({
        userId: actor.actorId,
        entity: 'payment',
        entityId: persistedPayment.id,
        action: 'REFUND',
        diff: {
          reservationId: reservation.id,
          amountCents: amountToRefund,
          provider: paymentToRefund.provider,
        },
        ip: context.ip,
        userAgent: context.userAgent,
      });

      return persistedPayment as PaymentRecord;
    });

    return toPaymentSummary(payment);
  }
}

export const adminPaymentService = new AdminPaymentService();

