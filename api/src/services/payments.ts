export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentsServiceOptions {
  commissionBasisPoints: number;
}

export class PaymentsService {
  private readonly commissionBasisPoints: number;

  constructor(options: PaymentsServiceOptions) {
    this.commissionBasisPoints = options.commissionBasisPoints;
  }

  calculateCommission(amount: number): number {
    return Math.round((amount * this.commissionBasisPoints) / 10000);
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: Record<string, unknown>): Promise<PaymentIntent> {
    const commission = this.calculateCommission(amount);

    return {
      id: `pi_${Date.now()}`,
      amount: amount + commission,
      currency,
      metadata: {
        ...metadata,
        commission,
      },
    };
  }
}
