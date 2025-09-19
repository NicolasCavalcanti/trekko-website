import { PaymentProvider, PaymentStatus } from '@prisma/client';

export type PaymentMetadata = Record<string, unknown>;

export interface PaymentsServiceOptions {
  commissionBasisPoints: number;
}

export type PaymentCaptureInput = {
  provider: PaymentProvider;
  amountCents: number;
  currency: string;
  metadata?: PaymentMetadata;
};

export type PaymentCaptureResult = {
  provider: PaymentProvider;
  approved: boolean;
  status: PaymentStatus;
  transactionId: string;
  amountCents: number;
  feeCents: number;
  netAmountCents: number;
  netAmountBRL: number;
  commissionBasisPoints: number;
  rawResponse: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
};

export type PaymentRefundInput = {
  provider: PaymentProvider;
  paymentId: string;
  amountCents: number;
  currency: string;
  metadata?: PaymentMetadata;
  reason?: string | null;
};

export type PaymentRefundResult = {
  provider: PaymentProvider;
  approved: boolean;
  status: PaymentStatus;
  refundedAmountCents: number;
  netAmountBRL: number;
  rawResponse: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
};

interface PaymentProviderAdapter {
  capture(input: PaymentCaptureInput): Promise<PaymentCaptureResult>;
  refund(input: PaymentRefundInput): Promise<PaymentRefundResult>;
}

const centsToBRL = (value: number): number => {
  if (!Number.isFinite(value) || value === 0) {
    return 0;
  }

  return Number((value / 100).toFixed(2));
};

const readBooleanFlag = (metadata: PaymentMetadata | undefined, key: string): boolean => {
  if (!metadata) {
    return false;
  }

  const rawValue = metadata[key];

  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  if (typeof rawValue === 'number') {
    return rawValue === 1;
  }

  return false;
};

class ManualPaymentProvider implements PaymentProviderAdapter {
  private readonly commissionBasisPoints: number;

  constructor(commissionBasisPoints: number) {
    this.commissionBasisPoints = commissionBasisPoints;
  }

  private calculateCommission(amountCents: number): number {
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return 0;
    }

    return Math.round((amountCents * this.commissionBasisPoints) / 10000);
  }

  async capture(input: PaymentCaptureInput): Promise<PaymentCaptureResult> {
    const transactionId = `manual_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    const shouldDecline = readBooleanFlag(input.metadata, 'simulateDecline');
    const commission = this.calculateCommission(input.amountCents);
    const netAmountCents = Math.max(input.amountCents - commission, 0);
    const netAmountBRL = centsToBRL(netAmountCents);

    if (shouldDecline) {
      return {
        provider: input.provider,
        approved: false,
        status: PaymentStatus.FAILED,
        transactionId,
        amountCents: input.amountCents,
        feeCents: 0,
        netAmountCents: 0,
        netAmountBRL: 0,
        commissionBasisPoints: this.commissionBasisPoints,
        rawResponse: {
          provider: 'manual',
          action: 'capture',
          outcome: 'declined',
          timestamp: new Date().toISOString(),
        },
        errorCode: 'SIMULATED_DECLINE',
        errorMessage: 'Simulated payment decline',
      } satisfies PaymentCaptureResult;
    }

    return {
      provider: input.provider,
      approved: true,
      status: PaymentStatus.PAID,
      transactionId,
      amountCents: input.amountCents,
      feeCents: commission,
      netAmountCents,
      netAmountBRL,
      commissionBasisPoints: this.commissionBasisPoints,
      rawResponse: {
        provider: 'manual',
        action: 'capture',
        outcome: 'approved',
        timestamp: new Date().toISOString(),
      },
    } satisfies PaymentCaptureResult;
  }

  async refund(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    const shouldFail = readBooleanFlag(input.metadata, 'simulateRefundFailure');

    if (shouldFail) {
      return {
        provider: input.provider,
        approved: false,
        status: PaymentStatus.FAILED,
        refundedAmountCents: 0,
        netAmountBRL: 0,
        rawResponse: {
          provider: 'manual',
          action: 'refund',
          outcome: 'failed',
          timestamp: new Date().toISOString(),
        },
        errorCode: 'SIMULATED_REFUND_FAILURE',
        errorMessage: 'Simulated refund failure',
      } satisfies PaymentRefundResult;
    }

    return {
      provider: input.provider,
      approved: true,
      status: PaymentStatus.REFUNDED,
      refundedAmountCents: input.amountCents,
      netAmountBRL: centsToBRL(input.amountCents),
      rawResponse: {
        provider: 'manual',
        action: 'refund',
        outcome: 'approved',
        timestamp: new Date().toISOString(),
      },
    } satisfies PaymentRefundResult;
  }
}

export class PaymentsService {
  private readonly commissionBasisPoints: number;

  private readonly manualProvider: PaymentProviderAdapter;

  private readonly providers: Map<PaymentProvider, PaymentProviderAdapter>;

  constructor(options: PaymentsServiceOptions) {
    const normalizedCommission = Number.isFinite(options.commissionBasisPoints)
      ? Math.max(0, Math.floor(options.commissionBasisPoints))
      : 0;

    this.commissionBasisPoints = normalizedCommission;
    this.manualProvider = new ManualPaymentProvider(this.commissionBasisPoints);
    this.providers = new Map<PaymentProvider, PaymentProviderAdapter>();

    this.providers.set(PaymentProvider.MERCADO_PAGO, this.manualProvider);
    this.providers.set(PaymentProvider.STRIPE, this.manualProvider);
    this.providers.set(PaymentProvider.MANUAL, this.manualProvider);
  }

  getCommissionBasisPoints(): number {
    return this.commissionBasisPoints;
  }

  calculateCommission(amountCents: number): number {
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return 0;
    }

    return Math.round((amountCents * this.commissionBasisPoints) / 10000);
  }

  calculateNetAmount(amountCents: number): number {
    const commission = this.calculateCommission(amountCents);
    return Math.max(amountCents - commission, 0);
  }

  private resolveProvider(provider: PaymentProvider): PaymentProviderAdapter {
    return this.providers.get(provider) ?? this.manualProvider;
  }

  async capture(input: PaymentCaptureInput): Promise<PaymentCaptureResult> {
    const provider = this.resolveProvider(input.provider);
    return provider.capture(input);
  }

  async refund(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    const provider = this.resolveProvider(input.provider);
    return provider.refund(input);
  }
}

