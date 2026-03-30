import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface PaymentLinkOptions {
  orderId: number;
  amount: number;
  description: string;
  externalReference: string;
  notificationUrl?: string;
}

export interface PaymentLinkResult {
  id: string;
  initPoint: string;
  sandboxInitPoint: string;
}

/**
 * Generates Mercado Pago payment preferences (links) for
 * remote payment flows (WhatsApp, email, etc.).
 */
@Injectable()
export class PaymentLinksService {
  private readonly logger = new Logger(PaymentLinksService.name);
  private readonly mpApiBase = 'https://api.mercadopago.com';

  private get accessToken(): string | undefined {
    return process.env.MP_ACCESS_TOKEN;
  }

  async createPaymentLink(opts: PaymentLinkOptions): Promise<PaymentLinkResult | null> {
    if (!this.accessToken) {
      this.logger.warn('MP_ACCESS_TOKEN not set — cannot create payment link');
      return null;
    }

    try {
      const res = await axios.post(
        `${this.mpApiBase}/checkout/preferences`,
        {
          items: [
            {
              title: opts.description,
              quantity: 1,
              unit_price: opts.amount,
              currency_id: 'CLP',
            },
          ],
          external_reference: opts.externalReference,
          notification_url: opts.notificationUrl ?? process.env.MP_NOTIFICATION_URL,
          auto_return: 'approved',
          back_urls: {
            success: process.env.MP_SUCCESS_URL ?? 'https://stonefungus.cl/gracias',
            failure: process.env.MP_FAILURE_URL ?? 'https://stonefungus.cl/error',
            pending: process.env.MP_PENDING_URL ?? 'https://stonefungus.cl/pendiente',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        id: res.data.id,
        initPoint: res.data.init_point,
        sandboxInitPoint: res.data.sandbox_init_point,
      };
    } catch (err) {
      this.logger.error('Failed to create MP payment link', err);
      return null;
    }
  }
}
