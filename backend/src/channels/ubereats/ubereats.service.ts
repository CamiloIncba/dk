import { Injectable, Logger } from '@nestjs/common';
import { OrderChannel } from '@prisma/client';
import { OrdersService } from '../../orders/orders.service';
import type { UberEatsWebhookDto } from './dto/ubereats-webhook.dto';

@Injectable()
export class UberEatsService {
  private readonly logger = new Logger(UberEatsService.name);

  constructor(private readonly ordersService: OrdersService) {}

  validateSignature(signature: string | undefined, _body: string): boolean {
    const secret = process.env.UBEREATS_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn('UBEREATS_WEBHOOK_SECRET not set — skipping validation');
      return true;
    }
    return !!signature;
  }

  async handleOrderNotification(dto: UberEatsWebhookDto) {
    const orderId = dto.meta?.resource_id ?? dto.event_id;
    this.logger.log(`Uber Eats notification: ${orderId}`);

    // In production: fetch full order via Uber Eats Orders API
    // GET ${dto.resource_href} with Bearer token
    // For now, if the full order is included in the webhook:
    if (!dto.order) {
      this.logger.warn('No order payload — fetch from Uber Eats API required');
      return { status: 'pending_fetch', externalId: orderId };
    }

    const items = dto.order.items.map((item) => ({
      productId: this.resolveProductId(item.title),
      quantity: item.quantity,
      extras: (item.selectedModifierGroups ?? []).flatMap((g) =>
        g.selectedItems.map((m) => ({
          optionId: this.resolveExtraOptionId(m.title),
          quantity: m.quantity,
        })),
      ),
    }));

    const noteParts = [
      `[CHANNEL:UBER_EATS]`,
      `UE #${dto.order.displayId}`,
      dto.order.eater?.firstName ? `Cliente: ${dto.order.eater.firstName}` : null,
      dto.order.eater?.phone ? `Tel: ${dto.order.eater.phone}` : null,
      dto.order.deliveryInfo?.address ? `Dir: ${dto.order.deliveryInfo.address}` : null,
    ].filter(Boolean);

    const order = await this.ordersService.createOrder({
      items,
      note: noteParts.join(' | '),
      channel: OrderChannel.UBER_EATS,
    });

    this.logger.log(`Uber Eats order ${dto.order.displayId} → internal #${order.id}`);
    return { internalOrderId: order.id, externalId: dto.order.id };
  }

  async handleCancel(dto: UberEatsWebhookDto) {
    this.logger.log(`Uber Eats cancel: ${dto.meta?.resource_id}`);
    // TODO: find internal order by external ID and cancel
  }

  private resolveProductId(title: string): number {
    this.logger.warn(`Product mapping needed for: "${title}" — using placeholder ID 1`);
    return 1;
  }

  private resolveExtraOptionId(title: string): number {
    this.logger.warn(`Extra option mapping needed for: "${title}" — using placeholder ID 1`);
    return 1;
  }
}
