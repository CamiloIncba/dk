import { Body, Controller, Post, Get, Delete, Param, Req, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateMpQrDto } from './dto/create-mp-qr.dto';
import { Request } from 'express';

@Controller('payments/mp')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ============================================================
  // QR Dinámico (Checkout Pro) - para kiosko
  // ============================================================

  @Post('qr')
  async createQr(@Body() dto: CreateMpQrDto) {
    return this.paymentsService.createMpQrForOrder(dto.orderId);
  }

  // ============================================================
  // QR Estático (Caja) - para terminal de caja
  // ============================================================

  /**
   * Crea/actualiza la orden en el QR estático de la caja
   * El cliente escanea el QR fijo y ve el monto actual
   */
  @Post('qr-static')
  async createQrStatic(@Body() dto: CreateMpQrDto) {
    return this.paymentsService.createQrOrder(dto.orderId);
  }

  /**
   * Limpia la orden del QR estático (para cancelar)
   */
  @Delete('qr-static')
  async deleteQrStatic() {
    return this.paymentsService.deleteQrOrder();
  }

  // ============================================================
  // QR Kiosko (autoservicio) - POS dedicado
  // ============================================================

  /**
   * Monta una orden en el QR estático del Kiosko.
   * El cliente escanea el QR físico del kiosko y paga.
   */
  @Post('kiosk/order')
  async createKioskOrder(@Body() dto: CreateMpQrDto) {
    return this.paymentsService.createKioskQrOrder(dto.orderId);
  }

  /**
   * Limpia la orden del QR del Kiosko
   */
  @Delete('kiosk/order')
  async deleteKioskOrder() {
    return this.paymentsService.deleteKioskQrOrder();
  }

  /**
   * Obtiene el QR del POS del Kiosko para imprimir una sola vez.
   */
  @Get('kiosk/qr')
  async getKioskQr() {
    return this.paymentsService.getKioskQrImage();
  }

  /**
   * Verifica el estado del pago para el Kiosko.
   * Más optimizado que check-payment genérico.
   */
  @Get('kiosk/check/:orderId')
  async checkKioskPayment(@Param('orderId') orderId: string) {
    return this.paymentsService.checkKioskPaymentStatus(parseInt(orderId, 10));
  }

  // ============================================================
  // Terminal Point (cobro con tarjeta)
  // ============================================================

  /**
   * Lista dispositivos Point vinculados
   */
  @Get('point/devices')
  async getPointDevices() {
    return this.paymentsService.getPointDevices();
  }

  /**
   * Obtiene el estado de un dispositivo Point específico
   * Útil para saber si está disponible antes de crear intención
   */
  @Get('point/device/:deviceId/status')
  async getPointDeviceStatus(@Param('deviceId') deviceId: string) {
    return this.paymentsService.getPointDeviceStatus(deviceId);
  }

  /**
   * Crea intención de pago en terminal Point
   */
  @Post('point/intent')
  async createPointIntent(
    @Body() dto: { orderId: number; deviceId: string; description?: string },
  ) {
    return this.paymentsService.createPointPaymentIntent(
      dto.orderId,
      dto.deviceId,
      dto.description,
    );
  }

  /**
   * Consulta estado de intención Point
   */
  @Get('point/intent/:deviceId/:intentId')
  async getPointIntentStatus(
    @Param('deviceId') deviceId: string,
    @Param('intentId') intentId: string,
  ) {
    return this.paymentsService.getPointPaymentIntentStatus(deviceId, intentId);
  }

  /**
   * Procesa resultado del pago Point y actualiza orden
   */
  @Post('point/process')
  async processPointPayment(
    @Body() dto: { orderId: number; deviceId: string; intentId: string },
  ) {
    return this.paymentsService.processPointPaymentResult(
      dto.orderId,
      dto.intentId,
      dto.deviceId,
    );
  }

  /**
   * Cancela intención de pago en terminal Point
   */
  @Delete('point/intent/:deviceId/:intentId')
  async cancelPointIntent(
    @Param('deviceId') deviceId: string,
    @Param('intentId') intentId: string,
  ) {
    return this.paymentsService.cancelPointPaymentIntent(deviceId, intentId);
  }

  /**
   * Limpia/resetea el dispositivo Point cancelando cualquier intent activo.
   * Útil para sincronizar kiosko cuando el Point quedó en estado inconsistente
   * (ej: timeout en Point, usuario canceló en terminal, etc.)
   * 
   * Devuelve el estado actual del dispositivo después de intentar limpiar.
   */
  @Post('point/clear/:deviceId')
  async clearPointDevice(@Param('deviceId') deviceId: string) {
    return this.paymentsService.clearPointDevice(deviceId);
  }

  // ============================================================
  // Webhooks de Mercado Pago
  // ============================================================

  /**
   * Webhook genérico de MP (pagos, QR, etc.)
   * También recibe eventos de Point (point_integration_wh)
   */
  @Post('webhook')
  async webhook(@Req() req: Request) {
    const body = (req as any).body;
    return this.paymentsService.handleMpWebhook(body);
  }

  /**
   * Webhook específico para Point Smart (punto de venta)
   * Recibe notificaciones de: finished, canceled, error, abandoned, expired
   * Configurar en MP: https://TU-DOMINIO/api/payments/mp/point/webhook
   */
  @Post('point/webhook')
  async pointWebhook(@Req() req: Request) {
    const body = (req as any).body;
    console.log('[POINT WEBHOOK ENDPOINT] Recibido:', JSON.stringify(body, null, 2));
    return this.paymentsService.handleMpWebhook(body);
  }

  // ============================================================
  // Verificación de estado de pago (polling desde frontend)
  // ============================================================

  /**
   * Verifica si hay un pago aprobado en MP para una orden.
   * Útil para confirmar pagos QR sin depender del webhook.
   */
  @Get('check-payment/:orderId')
  async checkPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.checkPaymentStatus(parseInt(orderId, 10));
  }

  // ============================================================
  // Búsqueda de todos los pagos de MP (incluyendo no vinculados)
  // ============================================================

  /**
   * Busca todos los pagos recibidos en Mercado Pago.
   * Incluye pagos no vinculados a órdenes (ej: escaneo directo de QR estático).
   */
  @Get('search-all')
  async searchAllPayments(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('dateFrom') dateFrom?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 30;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.paymentsService.searchAllMpPayments(parsedLimit, parsedOffset, dateFrom);
  }
}
