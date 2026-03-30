import { OrderChannel } from '@prisma/client';
import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  items: OrderItemDto[];
  note?: string;
  channel?: OrderChannel;
}
