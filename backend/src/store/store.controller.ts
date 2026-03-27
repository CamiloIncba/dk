import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { MenuService } from '../menu/menu.service';
import { OrdersService } from '../orders/orders.service';
import { CreateStoreOrderDto } from './dto/create-store-order.dto';

@Controller('api/v1/store')
export class StoreController {
  constructor(
    private readonly menuService: MenuService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('menu')
  async getMenu() {
    return this.menuService.getMenu();
  }

  @Post('orders')
  async createOrder(@Body() dto: CreateStoreOrderDto) {
    const internalNote = this.buildInternalNote(dto);
    return this.ordersService.createOrder({
      items: dto.items,
      note: internalNote,
    });
  }

  @Get('orders/:id/status')
  async getOrderStatus(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.getOrderById(id);
    return {
      id: order.id,
      status: order.status,
      kitchenStatus: order.kitchenStatus,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private buildInternalNote(dto: CreateStoreOrderDto): string | undefined {
    const customer = dto.customer ?? {};
    const lines: string[] = ['[CHANNEL:WEB_STORE]'];

    if (customer.name) lines.push(`Cliente: ${customer.name}`);
    if (customer.phone) lines.push(`Telefono: ${customer.phone}`);
    if (customer.address) lines.push(`Direccion: ${customer.address}`);
    if (dto.paymentMethod) lines.push(`Pago: ${dto.paymentMethod}`);
    if (dto.note) lines.push(`Nota: ${dto.note}`);

    return lines.join(' | ');
  }
}
