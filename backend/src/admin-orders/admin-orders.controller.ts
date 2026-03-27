import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AdminOrdersService, ManualPaymentDto } from './admin-orders.service';
import { ApiKeyGuard } from '../common';

@Controller(['admin/orders', 'api/v1/admin/orders'])
@UseGuards(ApiKeyGuard)
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  /**
   * GET /api/v1/admin/orders?channel=WEB_STORE&kitchenStatus=READY&limit=20
   * Lista pedidos admin con filtros opcionales.
   */
  @Get()
  async getOrders(
    @Query('channel') channel?: string,
    @Query('kitchenStatus') kitchenStatus?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const safeLimit =
      !Number.isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100
        ? parsedLimit
        : 50;

    return this.adminOrdersService.getAdminOrdersV1(safeLimit, {
      channel: channel || undefined,
      kitchenStatus: kitchenStatus || undefined,
    });
  }

  /**
   * GET /admin/orders/recent?limit=20
   *
   * Devuelve los últimos pedidos creados.
   * Lo vamos a usar en el menú secreto del kiosko
   * para:
   * - recuperar pedidos caídos
   * - reimprimir comprobantes
   * - reintentar pago
   */
  @Get('recent')
  async getRecent(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const safeLimit =
      !Number.isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100
        ? parsedLimit
        : 20;

    return this.adminOrdersService.getRecentOrders(safeLimit);
  }

  /**
   * GET /admin/orders/audit?limit=50&offset=0&dateFrom=2024-01-01&dateTo=2024-01-31&status=PAID&paymentMethod=cash&search=ABC123
   * Devuelve pedidos con información completa para auditoría
   */
  @Get('audit')
  async getOrdersForAudit(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('search') search?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    const filters = {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      status: status || undefined,
      paymentMethod: paymentMethod || undefined,
      search: search || undefined,
    };

    return this.adminOrdersService.getOrdersForAudit(parsedLimit, parsedOffset, filters);
  }

  /**
   * GET /admin/orders/mp-movements?limit=50&offset=0
   * Devuelve movimientos de Mercado Pago para auditoría
   */
  @Get('mp-movements')
  async getMPMovements(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.adminOrdersService.getMercadoPagoMovements(parsedLimit, parsedOffset);
  }

  /**
   * GET /admin/orders/manual-payment-reasons
   * Devuelve las razones disponibles para pago manual
   */
  @Get('manual-payment-reasons')
  getManualPaymentReasons() {
    return this.adminOrdersService.getManualPaymentReasons();
  }

  /**
   * PATCH /admin/orders/:id/pay-cash
   * @deprecated Usar POST /:id/pay-manual para auditoría completa
   */
  @Patch(':id/pay-cash')
  async markPaidCash(@Param('id', ParseIntPipe) id: number) {
    return this.adminOrdersService.markPaidCash(id);
  }

  /**
   * POST /admin/orders/:id/pay-manual
   * Marca un pedido como pagado manualmente con justificación
   */
  @Post(':id/pay-manual')
  async markPaidManual(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ManualPaymentDto,
  ) {
    return this.adminOrdersService.markPaidManual(id, dto);
  }

  /**
   * PATCH /admin/orders/:id/kitchen-status
   * Cambia el estado de cocina de un pedido
   * body: { status: string, source?: string, changedBy?: string }
   */
  @Patch(':id/kitchen-status')
  async updateKitchenStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; source?: string; changedBy?: string; notes?: string },
  ) {
    return this.adminOrdersService.updateKitchenStatus(id, body.status, {
      source: body.source,
      changedBy: body.changedBy,
      notes: body.notes,
    });
  }
}
