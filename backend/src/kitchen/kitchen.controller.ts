import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { UpdateKitchenStatusDto } from './dto/update-kitchen-status.dto';
import { ApiKeyGuard, Public } from '../common';

@Controller('kitchen')
@UseGuards(ApiKeyGuard)
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  /**
   * Lista órdenes para la cocina:
   * - sólo órdenes PAID
   * - kitchenStatus = PENDING o IN_PREPARATION
   */
  @Get('orders')
  async getActiveOrders() {
    return this.kitchenService.getActiveKitchenOrders();
  }

  /**
   * Lista órdenes READY (listas para retirar):
   * - sólo órdenes PAID
   * - kitchenStatus = READY
   */
  @Get('orders/ready')
  async getReadyOrders() {
    return this.kitchenService.getReadyKitchenOrders();
  }

  /**
   * Cambia el estado de cocina de una orden.
   * body: { "status": "IN_PREPARATION" | "READY" | "CANCELLED" | "PENDING" | "DELIVERED", source?: string, changedBy?: string }
   */
  @Patch('orders/:id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateKitchenStatusDto,
  ) {
    return this.kitchenService.updateKitchenStatus(id, body.status, {
      source: body.source,
      changedBy: body.changedBy,
      notes: body.notes,
    });
  }

  /**
   * Endpoint PÚBLICO para la pantalla de pedidos.
   * Devuelve solo códigos de recibo y estados, sin detalles.
   * No requiere API Key.
   */
  @Public()
  @Get('display')
  async getDisplayOrders() {
    return this.kitchenService.getDisplayOrders();
  }
}
