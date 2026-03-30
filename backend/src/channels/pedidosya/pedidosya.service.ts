import { Injectable, Logger } from '@nestjs/common';
import { OrderChannel } from '@prisma/client';
import { OrdersService } from '../../orders/orders.service';
import { KitchenService } from '../../kitchen/kitchen.service';
import type { PedidosYaWebhookDto } from './dto/pedidosya-webhook.dto';

@Injectable()
export class PedidosYaService {
  private readonly logger = new Logger(PedidosYaService.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly kitchenService: KitchenService,
  ) {}

  /**
   * Validates the PedidosYa webhook signature.
   * In production, compare HMAC-SHA256 of body with the shared secret.
   */
  validateSignature(signature: string | undefined, _body: string): boolean {
    const secret = process.env.PEDIDOSYA_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn('PEDIDOSYA_WEBHOOK_SECRET not set — skipping validation');
      return true;
    }
    // TODO: implement HMAC-SHA256 verification when credentials are available
    return !!signature;
  }

  async handleNewOrder(dto: PedidosYaWebhookDto) {
    this.logger.log(`PedidosYa new order: ${dto.id}`);

    const items = (dto.details ?? []).map((item) => ({
      // Map PY product ID → internal product ID (requires a mapping table or name match)
      productId: this.resolveProductId(item.name),
      quantity: item.quantity,
      extras: (item.optionGroups ?? []).flatMap((g) =>
        g.options.map((o) => ({
          optionId: this.resolveExtraOptionId(o.name),
          quantity: o.quantity,
        })),
      ),
    }));

    const noteParts = [
      `[CHANNEL:PEDIDOS_YA]`,
      `PY #${dto.id}`,
      dto.customer?.name ? `Cliente: ${dto.customer.name}` : null,
      dto.customer?.phone ? `Tel: ${dto.customer.phone}` : null,
      dto.address?.street ? `Dir: ${dto.address.street}` : null,
    ].filter(Boolean);

    const order = await this.ordersService.createOrder({
      items,
      note: noteParts.join(' | '),
      channel: OrderChannel.PEDIDOS_YA,
    });

    this.logger.log(`PedidosYa order ${dto.id} → internal order #${order.id}`);
    return { internalOrderId: order.id, externalId: dto.id };
  }

  async handleStateChange(dto: PedidosYaWebhookDto) {
    this.logger.log(`PedidosYa state change: ${dto.id} → ${dto.state}`);
    // Map PY states to internal kitchen statuses when needed
    // e.g., CANCELLED → cancel internal order
  }

  /**
   * Placeholder: resolve PedidosYa product name to internal product ID.
   * In production, use a mapping table (admin-configurable).
   */
  private resolveProductId(name: string): number {
    this.logger.warn(`Product mapping needed for: "${name}" — using placeholder ID 1`);
    return 1;
  }

  private resolveExtraOptionId(name: string): number {
    this.logger.warn(`Extra option mapping needed for: "${name}" — using placeholder ID 1`);
    return 1;
  }
}
