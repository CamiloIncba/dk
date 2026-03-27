import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { OrderStatus } from '@prisma/client';

/**
 * Tipos de intención de pago para terminal Point
 */
export interface PointPaymentIntentResponse {
  id: string;
  device_id: string;
  amount: number;
  state: string;
  additional_info?: {
    external_reference?: string;
  };
}

/**
 * Estado de intención de pago Point
 */
export interface PointPaymentStatus {
  id: string;
  state: string; // 'open', 'on_terminal', 'processing', 'finished', 'canceled', 'error'
  payment?: {
    id: string;
    type: string;
    status: string;
    status_detail?: string;
  };
}

@Injectable()
export class PaymentsService {
  private readonly mpApiBase = 'https://api.mercadopago.com';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper para actualizar estado de orden y registrar en log de auditoría
   */
  private async updateOrderStatusWithLog(
    orderId: number,
    newStatus: OrderStatus,
    source: string,
    notes?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    if (!order) return;

    const previousStatus = order.status;

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      }),
      this.prisma.orderStatusLog.create({
        data: {
          orderId,
          fieldChanged: 'status',
          previousValue: previousStatus,
          newValue: newStatus,
          source,
          notes,
        },
      }),
    ]);
  }

  /**
   * Obtiene el access token de MP, lanzando error si no está configurado
   */
  private getAccessToken(): string {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
      throw new InternalServerErrorException('MP_ACCESS_TOKEN no configurado');
    }
    return token;
  }

  /**
   * Headers comunes para llamadas a MP API
   */
  private getMpHeaders() {
    return {
      Authorization: `Bearer ${this.getAccessToken()}`,
      'Content-Type': 'application/json',
    };
  }

  // ============================================================
  // MERCADO PAGO POINT (Terminal física)
  // ============================================================

  /**
   * Obtiene los dispositivos Point vinculados a la cuenta
   */
  async getPointDevices(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.mpApiBase}/point/integration-api/devices`,
        { headers: this.getMpHeaders() },
      );
      return response.data.devices || [];
    } catch (error: any) {
      console.error('Error obteniendo dispositivos Point:', error.response?.data || error.message);
      throw new InternalServerErrorException('No se pudieron obtener los dispositivos Point');
    }
  }

  /**
   * Obtiene el estado de un dispositivo Point específico.
   * Devuelve información sobre si está disponible (FREE) u ocupado (BUSY).
   */
  async getPointDeviceStatus(deviceId: string): Promise<{
    id: string;
    operating_mode: string;
    status: string; // 'FREE' | 'BUSY' | etc.
    available: boolean;
    message: string;
  }> {
    try {
      const devices = await this.getPointDevices();
      const device = devices.find((d: any) => d.id === deviceId);
      
      if (!device) {
        return {
          id: deviceId,
          operating_mode: 'UNKNOWN',
          status: 'NOT_FOUND',
          available: false,
          message: 'Dispositivo no encontrado en la cuenta',
        };
      }

      // La API de dispositivos incluye un campo 'status' con valores como 'FREE', 'BUSY'
      const isFree = device.status === 'FREE';
      
      return {
        id: device.id,
        operating_mode: device.operating_mode || 'UNKNOWN',
        status: device.status || 'UNKNOWN',
        available: isFree,
        message: isFree 
          ? 'Terminal disponible para recibir pagos'
          : 'Terminal ocupado - tiene una operación en curso',
      };
    } catch (error: any) {
      console.error('Error obteniendo estado de dispositivo:', error.message);
      return {
        id: deviceId,
        operating_mode: 'UNKNOWN',
        status: 'ERROR',
        available: false,
        message: 'No se pudo consultar el estado del terminal',
      };
    }
  }

  /**
   * Limpia/resetea un dispositivo Point.
   * Busca intenciones de pago activas y las cancela si es posible.
   * 
   * Esto es útil cuando el kiosko y el Point se dessincronizan:
   * - El Point mostró timeout/error pero el kiosko no se enteró
   * - El cliente canceló en el Point pero el kiosko sigue mostrando "Acerque tarjeta"
   * 
   * Devuelve el estado actual del dispositivo después de limpiar.
   */
  async clearPointDevice(deviceId: string): Promise<{
    deviceStatus: {
      id: string;
      operating_mode: string;
      status: string;
      available: boolean;
      message: string;
    };
    cleanupResult: {
      attemptedCancellation: boolean;
      success: boolean;
      message: string;
    };
  }> {
    console.log(`[clearPointDevice] Intentando limpiar dispositivo: ${deviceId}`);
    
    // 1. Obtener estado actual del dispositivo
    const deviceStatus = await this.getPointDeviceStatus(deviceId);
    
    // 2. Si el dispositivo está disponible (FREE), no hay nada que limpiar
    if (deviceStatus.available) {
      console.log(`[clearPointDevice] Dispositivo ${deviceId} ya está disponible (FREE)`);
      return {
        deviceStatus,
        cleanupResult: {
          attemptedCancellation: false,
          success: true,
          message: 'El terminal ya está disponible',
        },
      };
    }
    
    // 3. Si está ocupado (BUSY), intentar encontrar y cancelar intenciones activas
    console.log(`[clearPointDevice] Dispositivo ${deviceId} está ocupado (${deviceStatus.status})`);
    
    // Nota: La API de MP Point no tiene un endpoint para listar intenciones activas de un dispositivo
    // Solo podemos cancelar si conocemos el ID del intent
    // Lo que podemos hacer es:
    // - Esperar que el timeout del Point libere el dispositivo
    // - O el cliente/operador debe actuar en el terminal físico
    
    // Sin embargo, podemos verificar el estado nuevamente después de un breve delay
    // por si el Point ya se liberó naturalmente
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const deviceStatusAfter = await this.getPointDeviceStatus(deviceId);
    
    return {
      deviceStatus: deviceStatusAfter,
      cleanupResult: {
        attemptedCancellation: false,
        success: deviceStatusAfter.available,
        message: deviceStatusAfter.available 
          ? 'El terminal se liberó correctamente'
          : 'El terminal sigue ocupado. Debe completarse o cancelarse la operación en el terminal físico, o esperar el timeout automático (~60-120 segundos).',
      },
    };
  }

  /**
   * Busca intenciones de pago recientes para un dispositivo.
   * Útil para detectar intenciones activas/pendientes antes de crear una nueva.
   * 
   * NOTA: Este endpoint de la API legacy de Point puede no existir.
   * La API nueva usa /v1/orders pero es diferente.
   */
  async getLastPaymentIntent(paymentIntentId: string): Promise<PointPaymentStatus | null> {
    try {
      const response = await axios.get(
        `${this.mpApiBase}/point/integration-api/payment-intents/${paymentIntentId}`,
        { headers: this.getMpHeaders() },
      );
      return response.data;
    } catch (error: any) {
      // Si no existe, devolver null
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error buscando intención Point:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Intenta cancelar una intención de pago pendiente.
   * Devuelve true si se canceló, false si no se pudo (ya procesada/terminada).
   */
  async tryToCancelPointIntent(deviceId: string, paymentIntentId: string): Promise<boolean> {
    try {
      await axios.delete(
        `${this.mpApiBase}/point/integration-api/devices/${deviceId}/payment-intents/${paymentIntentId}`,
        { headers: this.getMpHeaders() },
      );
      console.log(`Intención ${paymentIntentId} cancelada exitosamente`);
      return true;
    } catch (error: any) {
      // 409 Conflict = ya no está en estado cancelable (on_terminal, processing, finished, etc.)
      // 404 Not Found = ya no existe
      const status = error.response?.status;
      if (status === 409 || status === 404 || status === 400) {
        console.log(`Intención ${paymentIntentId} no se pudo cancelar (status: ${status}) - probablemente ya procesada`);
        return false;
      }
      console.error('Error cancelando intención Point:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Crea una intención de pago en un dispositivo Point específico
   * El terminal mostrará la pantalla de cobro automáticamente
   */
  async createPointPaymentIntent(
    orderId: number,
    deviceId: string,
    description?: string,
  ): Promise<PointPaymentIntentResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const amountInPesos = Number(order.totalAmount);
    if (amountInPesos <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    // Point API espera el monto en CENTAVOS (1500 = $15.00)
    // Monto mínimo: $15.00 (1500 centavos)
    const amountInCents = Math.round(amountInPesos * 100);
    
    if (amountInCents < 1500) {
      throw new BadRequestException('El monto mínimo para Point es $15.00');
    }

    const body = {
      amount: amountInCents,
      additional_info: {
        external_reference: orderId.toString(),
        print_on_terminal: true,
      },
    };

    try {
      const response = await axios.post(
        `${this.mpApiBase}/point/integration-api/devices/${deviceId}/payment-intents`,
        body,
        { headers: this.getMpHeaders() },
      );

      console.log('Intención de pago Point creada:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creando intención Point:', error.response?.data || error.message);
      
      const mpError = error.response?.data;
      
      // device_busy: El terminal tiene una operación en curso (pantalla de pago, error, etc.)
      // En modo autoservicio, esto es problemático porque no podemos limpiar la pantalla vía API
      // Solo podemos cancelar si la intención está en estado 'open' (antes de llegar al terminal)
      if (mpError?.error === 'device_busy') {
        throw new BadRequestException({
          error: 'POINT_DEVICE_BUSY',
          message: 'El terminal está ocupado con otra operación.',
          detail: 'En autoservicio, el cliente debe completar o cancelar la operación en el terminal físicamente, o esperar el timeout (~60-120 segundos).',
          suggestion: 'USE_QR_INSTEAD',
          canRetryAfterSeconds: 120,
        });
      }
      
      if (mpError?.error === 'device_not_found') {
        throw new BadRequestException({
          error: 'POINT_DEVICE_NOT_FOUND',
          message: 'Terminal no encontrado.',
          detail: 'Verificá que el terminal esté encendido, conectado a internet, y en modo PDV.',
          suggestion: 'CHECK_DEVICE_STATUS',
        });
      }
      
      // Error de intención duplicada o conflicto
      if (error.response?.status === 409) {
        throw new BadRequestException({
          error: 'POINT_INTENT_CONFLICT',
          message: 'Ya existe una intención de pago activa para este terminal.',
          detail: 'Esperá que se complete o cancele la intención anterior.',
          suggestion: 'WAIT_OR_USE_QR',
        });
      }

      throw new InternalServerErrorException('No se pudo crear la intención de pago en el terminal');
    }
  }

  /**
   * Consulta el estado de una intención de pago Point
   */
  async getPointPaymentIntentStatus(
    deviceId: string,
    paymentIntentId: string,
  ): Promise<PointPaymentStatus> {
    try {
      const response = await axios.get(
        `${this.mpApiBase}/point/integration-api/devices/${deviceId}/payment-intents/${paymentIntentId}`,
        { headers: this.getMpHeaders() },
      );
      // Log detallado para debug
      console.log('📡 Estado del intent Point:', JSON.stringify({
        intentId: paymentIntentId,
        state: response.data.state,
        paymentId: response.data.payment?.id,
        fullResponse: response.data
      }, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('❌ Error consultando estado Point:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      // Si el intent no existe (expiró o fue cancelado), devolver un estado que indique eso
      if (error.response?.status === 404) {
        console.log('🔴 Intent no encontrado (404) - devolviendo abandoned');
        return {
          id: paymentIntentId,
          state: 'abandoned',
          additional_info: { message: 'Intent no encontrado - posiblemente expiró o fue cancelado' }
        } as PointPaymentStatus;
      }
      
      throw new InternalServerErrorException('No se pudo consultar el estado del pago');
    }
  }

  /**
   * Cancela una intención de pago en el terminal Point
   */
  async cancelPointPaymentIntent(
    deviceId: string,
    paymentIntentId: string,
  ): Promise<{ cancelled: boolean }> {
    try {
      await axios.delete(
        `${this.mpApiBase}/point/integration-api/devices/${deviceId}/payment-intents/${paymentIntentId}`,
        { headers: this.getMpHeaders() },
      );
      return { cancelled: true };
    } catch (error: any) {
      console.error('Error cancelando intención Point:', error.response?.data || error.message);
      
      // Si ya terminó, no se puede cancelar pero no es error
      if (error.response?.status === 400) {
        return { cancelled: false };
      }
      
      throw new InternalServerErrorException('No se pudo cancelar la intención de pago');
    }
  }

  /**
   * Procesa el resultado del pago Point y actualiza la orden
   */
  async processPointPaymentResult(
    orderId: number,
    paymentIntentId: string,
    deviceId: string,
  ): Promise<{ status: string; orderId: number; mpPaymentId?: string }> {
    const intentStatus = await this.getPointPaymentIntentStatus(deviceId, paymentIntentId);
    
    console.log('Estado intención Point:', intentStatus);

    // Si el pago se completó, consultar detalles
    if (intentStatus.state === 'finished' && intentStatus.payment) {
      const mpPaymentId = intentStatus.payment.id;
      const paymentStatus = intentStatus.payment.status;

      // Registrar en PaymentLog
      try {
        await this.prisma.paymentLog.upsert({
          where: { mpPaymentId },
          create: {
            orderId,
            mpPaymentId,
            status: paymentStatus,
            statusDetail: intentStatus.payment.status_detail,
            paymentType: intentStatus.payment.type || 'point',
            paymentMethod: 'point_terminal',
            operationType: 'regular_payment',
          },
          update: {
            status: paymentStatus,
            statusDetail: intentStatus.payment.status_detail,
          },
        });
      } catch (e: any) {
        console.error('Error guardando PaymentLog Point:', e?.message || e);
      }

      // Actualizar estado de orden con auditoría
      let newStatus: OrderStatus | null = null;
      if (paymentStatus === 'approved') {
        newStatus = OrderStatus.PAID;
      } else if (paymentStatus === 'rejected') {
        newStatus = OrderStatus.PAYMENT_FAILED;
      }

      if (newStatus) {
        await this.updateOrderStatusWithLog(
          orderId,
          newStatus,
          'mp-point-terminal',
          `Pago Point: ${paymentStatus} - ${mpPaymentId}`,
        );
      }

      return { status: paymentStatus, orderId, mpPaymentId };
    }

    // Si fue cancelado
    if (intentStatus.state === 'canceled') {
      return { status: 'cancelled', orderId };
    }

    // Aún en proceso
    return { status: intentStatus.state, orderId };
  }

  // ============================================================
  // QR DINÁMICO (Caja Mercado Pago - para QR estático)
  // ============================================================

  /**
   * Crea una orden en la caja (QR estático) de Mercado Pago
   * El cliente escanea el QR fijo de la caja y ve el monto actual
   */
  async createQrOrder(orderId: number): Promise<{ qrData: string; inStoreOrderId: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            extras: {
              include: {
                extraOption: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const userId = process.env.MP_USER_ID;
    const externalStoreId = process.env.MP_EXTERNAL_STORE_ID || 'SUCURSAL001';
    const externalPosId = process.env.MP_EXTERNAL_POS_ID;

    if (!userId || !externalPosId) {
      throw new InternalServerErrorException(
        'MP_USER_ID o MP_EXTERNAL_POS_ID no configurados para QR estático',
      );
    }

    // Construir items incluyendo extras
    const items: any[] = [];
    for (const item of order.items) {
      // Item principal
      items.push({
        sku_number: item.productId.toString(),
        title: item.product.name,
        unit_price: Number(item.unitPrice),
        quantity: item.quantity,
        unit_measure: 'unit',
        total_amount: Number(item.unitPrice) * item.quantity,
      });

      // Extras del item
      for (const extra of item.extras) {
        const extraTotal = Number(extra.unitPrice) * extra.quantity * item.quantity;
        if (extraTotal > 0) {
          items.push({
            sku_number: `extra-${extra.extraOptionId}`,
            title: `+ ${extra.extraOption.name}`,
            unit_price: Number(extra.unitPrice),
            quantity: extra.quantity * item.quantity,
            unit_measure: 'unit',
            total_amount: extraTotal,
          });
        }
      }
    }

    const body = {
      external_reference: orderId.toString(),
      title: `Pedido #${orderId}`,
      description: `Pedido en Casa Rica`,
      total_amount: Number(order.totalAmount),
      items,
      notification_url: process.env.MP_WEBHOOK_URL,
      expiration_date: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
    };

    try {
      // Nota: La API de QR Estático usa PUT, no POST
      const response = await axios.put(
        `${this.mpApiBase}/instore/qr/seller/collectors/${userId}/pos/${externalPosId}/orders`,
        body,
        { headers: this.getMpHeaders() },
      );

      console.log('Orden QR estático creada:', response.data);

      return {
        qrData: response.data.qr_data || '',
        inStoreOrderId: response.data.in_store_order_id || '',
      };
    } catch (error: any) {
      console.error('Error creando orden QR:', error.response?.data || error.message);
      throw new InternalServerErrorException('No se pudo crear la orden para QR estático');
    }
  }

  /**
   * Elimina la orden actual del QR estático (para cancelar o limpiar)
   */
  async deleteQrOrder(): Promise<{ deleted: boolean }> {
    const userId = process.env.MP_USER_ID;
    const externalPosId = process.env.MP_EXTERNAL_POS_ID;

    if (!userId || !externalPosId) {
      return { deleted: false };
    }

    try {
      await axios.delete(
        `${this.mpApiBase}/instore/qr/seller/collectors/${userId}/pos/${externalPosId}/orders`,
        { headers: this.getMpHeaders() },
      );
      return { deleted: true };
    } catch (error: any) {
      console.error('Error eliminando orden QR:', error.response?.data || error.message);
      return { deleted: false };
    }
  }

  /**
   * Crea una preferencia de Mercado Pago para una orden existente
   * y devuelve los datos necesarios para mostrar el QR / link.
   */
  async createMpQrForOrder(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            extras: {
              include: {
                extraOption: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (!order.items || order.items.length === 0) {
      throw new InternalServerErrorException('La orden no tiene ítems');
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new InternalServerErrorException('MP_ACCESS_TOKEN no configurado');
    }

    // Construir items para MP incluyendo extras
    const items: Array<{
      title: string;
      quantity: number;
      unit_price: number;
      currency_id: string;
    }> = [];

    for (const item of order.items) {
      // Agregar el producto principal
      items.push({
        title: item.product.name,
        quantity: item.quantity,
        unit_price: Number(item.unitPrice),
        currency_id: 'ARS',
      });

      // Agregar cada extra como ítem separado
      for (const extra of item.extras) {
        items.push({
          title: `${item.product.name} + ${extra.extraOption.name}`,
          quantity: extra.quantity * item.quantity, // extras por cada unidad del producto
          unit_price: Number(extra.unitPrice),
          currency_id: 'ARS',
        });
      }
    }

    const body: any = {
      items,
      external_reference: order.id.toString(),
    };

    const notificationUrl = process.env.MP_WEBHOOK_URL;
    if (notificationUrl) {
      body.notification_url = notificationUrl;
    }

    try {
      const response = await axios.post(
        'https://api.mercadopago.com/checkout/preferences',
        body,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data;

      return {
        preferenceId: data.id,
        initPoint: data.init_point,
        sandboxInitPoint: data.sandbox_init_point,
        externalReference: data.external_reference,
      };
    } catch (error: any) {
      console.error(
        'Error creando preferencia Mercado Pago:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        'No se pudo crear la preferencia de pago',
      );
    }
  }

  /**
   * Webhook de Mercado Pago.
   * Marca la orden como PAID / PAYMENT_FAILED / CANCELLED según el pago
   * y registra TODOS los intentos de pago en PaymentLog.
   * También maneja eventos de Point Smart (point_integration_wh).
   */
  async handleMpWebhook(payload: any) {
    console.log(
      'Webhook Mercado Pago recibido:',
      JSON.stringify(payload, null, 2),
    );

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new InternalServerErrorException('MP_ACCESS_TOKEN no configurado');
    }

    const eventType = payload.type || payload.action || payload.topic || 'unknown';
    const eventTypeStr = String(eventType).toLowerCase();

    // ============================================================
    // POINT SMART WEBHOOK (point_integration_wh)
    // Eventos: finished, canceled, error, abandoned, expired
    // ============================================================
    if (eventTypeStr.includes('point_integration') || eventTypeStr.includes('point')) {
      return this.handlePointWebhook(payload);
    }

    const paymentId =
      payload.data?.id ||
      payload.data?.resource ||
      payload.resource ||
      payload.id;

    if (!paymentId) {
      console.warn('Webhook sin paymentId identificable.');
      return { received: true };
    }

    if (!eventTypeStr.includes('payment')) {
      console.log(`Evento ${eventType} ignorado (no es pago ni point).`);
      return { received: true };
    }

    try {
      const paymentResponse = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const payment = paymentResponse.data;

      const mpPaymentId = String(payment.id);
      const externalReference = payment.external_reference;
      const status: string = payment.status;
      const statusDetail: string | undefined = payment.status_detail;
      const paymentType: string | undefined = payment.payment_type_id;
      const paymentMethod: string | undefined = payment.payment_method_id;
      const operationType: string | undefined = payment.operation_type;
      const transactionAmount: number | undefined = payment.transaction_amount;
      const installments: number | undefined = payment.installments;
      const payerEmail: string | undefined = payment.payer?.email;

      console.log('Pago consultado:', {
        mpPaymentId,
        status,
        statusDetail,
        paymentType,
        paymentMethod,
        externalReference,
      });

      if (!externalReference) {
        console.warn(
          'Pago sin external_reference, no se puede asociar a una orden.',
        );
        return { received: true };
      }

      const orderId = parseInt(externalReference, 10);
      if (Number.isNaN(orderId)) {
        console.warn(
          `external_reference "${externalReference}" no es un id de orden válido.`,
        );
        return { received: true };
      }

      // 1) Registrar / actualizar el intento de pago en PaymentLog
      try {
        await this.prisma.paymentLog.upsert({
          where: { mpPaymentId },
          create: {
            orderId,
            mpPaymentId,
            status,
            statusDetail,
            paymentType,
            paymentMethod,
            operationType,
            transactionAmount,
            installments,
            payerEmail,
            rawPayload: payment,
          },
          update: {
            status,
            statusDetail,
            paymentType,
            paymentMethod,
            operationType,
            transactionAmount,
            installments,
            payerEmail,
            rawPayload: payment,
          },
        });
      } catch (e: any) {
        console.error('Error guardando PaymentLog:', e?.message || e);
      }

      // 2) Actualizar estado de la orden según el resultado
      let newStatus: OrderStatus | null = null;

      // OK
      if (status === 'approved' || status === 'authorized') {
        newStatus = OrderStatus.PAID;
      }

      // Fallo “reintetable”
      else if (status === 'rejected' || status === 'cancelled') {
        newStatus = OrderStatus.PAYMENT_FAILED;
      }

      // Fallo “final” (plata devuelta o contracargo)
      else if (status === 'refunded' || status === 'charged_back') {
        newStatus = OrderStatus.CANCELLED;
      }

      if (!newStatus) {
        console.log(`Estado de pago ${status} no cambia el estado de la orden.`);
        return { received: true };
      }

      // Actualizar estado con auditoría
      await this.updateOrderStatusWithLog(
        orderId,
        newStatus,
        'mp-qr-webhook',
        `Pago QR webhook: ${status} - ${mpPaymentId}`,
      );

      console.log(`Orden ${orderId} marcada como ${newStatus}.`);

      return { received: true };
    } catch (error: any) {
      console.error(
        'Error procesando webhook Mercado Pago:',
        error.response?.data || error.message,
      );
      return { received: false };
    }
  }

  /**
   * Maneja webhooks de Point Smart (point_integration_wh).
   * Eventos posibles del payment_intent:
   * - finished: Pago completado exitosamente
   * - canceled: Intención cancelada por el usuario o el sistema
   * - error: Error durante el procesamiento
   * - abandoned: El cliente abandonó la terminal
   * - expired: La intención expiró por timeout
   * 
   * El payload contiene:
   * - data.id: ID del payment_intent
   * - state: Estado del intent (finished, canceled, error, etc.)
   */
  private async handlePointWebhook(payload: any): Promise<{ received: boolean; action?: string }> {
    console.log('[POINT WEBHOOK] Procesando evento Point:', JSON.stringify(payload, null, 2));

    try {
      // Extraer información del payload
      // El webhook de Point puede venir en diferentes formatos
      const intentId = payload.data?.id || payload.id || payload.payment_intent_id;
      const state = payload.state || payload.data?.state || payload.status;
      const deviceId = payload.device_id || payload.data?.device_id;
      
      console.log(`[POINT WEBHOOK] Intent: ${intentId}, State: ${state}, Device: ${deviceId}`);

      if (!intentId) {
        console.warn('[POINT WEBHOOK] Sin intent ID identificable');
        return { received: true };
      }

      // Intentar obtener más información del payment_intent si hay payment asociado
      let paymentId: string | undefined;
      let orderId: number | undefined;
      let paymentStatus: string | undefined;

      // Si el estado es 'finished', buscar el pago asociado
      if (state === 'finished') {
        // El payment_intent terminado debería tener un payment asociado
        // Buscamos en los PaymentLogs recientes con este pattern
        const recentLog = await this.prisma.paymentLog.findFirst({
          where: {
            rawPayload: {
              path: ['point_of_interaction', 'type'],
              equals: 'POINT',
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (recentLog) {
          paymentId = recentLog.mpPaymentId;
          orderId = recentLog.orderId;
          paymentStatus = recentLog.status;
          console.log(`[POINT WEBHOOK] Encontrado pago asociado: ${paymentId} para orden ${orderId}`);
        }
      }

      // Registrar el evento en un log específico de Point
      // Usamos PaymentLog con un prefijo especial para Point events
      try {
        await this.prisma.paymentLog.create({
          data: {
            orderId: orderId || 0, // 0 si no podemos asociar
            mpPaymentId: `point_event_${intentId}_${Date.now()}`,
            status: state || 'unknown',
            statusDetail: `Point webhook: ${state}`,
            paymentType: 'point_terminal',
            paymentMethod: 'point',
            rawPayload: payload,
          },
        });
      } catch (logError: any) {
        console.error('[POINT WEBHOOK] Error registrando evento:', logError.message);
      }

      // Determinar acción basada en el estado
      let action = 'none';
      
      switch (state) {
        case 'finished':
          action = 'payment_completed';
          console.log('[POINT WEBHOOK] ✅ Pago Point completado');
          // El pago se procesará por el webhook de payment normal
          break;

        case 'canceled':
          action = 'payment_canceled';
          console.log('[POINT WEBHOOK] ❌ Pago Point cancelado por usuario/sistema');
          break;

        case 'error':
          action = 'payment_error';
          console.log('[POINT WEBHOOK] ⚠️ Error en pago Point');
          break;

        case 'abandoned':
          action = 'payment_abandoned';
          console.log('[POINT WEBHOOK] 🚪 Cliente abandonó la terminal Point');
          break;

        case 'expired':
          action = 'payment_expired';
          console.log('[POINT WEBHOOK] ⏰ Intención de pago Point expirada');
          break;

        default:
          console.log(`[POINT WEBHOOK] Estado desconocido: ${state}`);
      }

      return { received: true, action };

    } catch (error: any) {
      console.error('[POINT WEBHOOK] Error procesando:', error.message);
      return { received: false };
    }
  }

  /**
   * Verifica si hay un pago aprobado en Mercado Pago para una orden específica.
   * Esto permite confirmar pagos QR sin depender del webhook (útil en desarrollo/test).
   * Busca pagos por external_reference y verifica si alguno está aprobado.
   */
  async checkPaymentStatus(orderId: number): Promise<{
    paid: boolean;
    paymentId?: string;
    status?: string;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Si ya está pagada, retornar directamente
    if (order.status === 'PAID') {
      return { paid: true };
    }

    try {
      // Buscar pagos en MP con el external_reference de esta orden
      const response = await axios.get(
        `${this.mpApiBase}/v1/payments/search`,
        {
          headers: this.getMpHeaders(),
          params: {
            external_reference: orderId.toString(),
            sort: 'date_created',
            criteria: 'desc',
          },
        },
      );

      const payments = response.data.results || [];
      console.log(`Buscando pagos para orden ${orderId}:`, payments.length, 'encontrados');

      // Buscar un pago aprobado
      const approvedPayment = payments.find(
        (p: any) => p.status === 'approved',
      );

      if (approvedPayment) {
        console.log(`Pago aprobado encontrado para orden ${orderId}:`, approvedPayment.id);

        // Actualizar la orden a PAID con auditoría si no lo estaba
        await this.updateOrderStatusWithLog(
          orderId,
          OrderStatus.PAID,
          'mp-qr-poll',
          `Pago QR confirmado por polling: ${approvedPayment.id}`,
        );

        // Registrar en PaymentLog si no existe
        const existingLog = await this.prisma.paymentLog.findFirst({
          where: { mpPaymentId: approvedPayment.id.toString() },
        });

        if (!existingLog) {
          await this.prisma.paymentLog.create({
            data: {
              orderId,
              mpPaymentId: approvedPayment.id.toString(),
              status: approvedPayment.status,
              statusDetail: approvedPayment.status_detail,
              paymentType: approvedPayment.payment_type_id,
              paymentMethod: approvedPayment.payment_method_id,
              operationType: approvedPayment.operation_type,
              transactionAmount: approvedPayment.transaction_amount,
              installments: approvedPayment.installments,
              payerEmail: approvedPayment.payer?.email,
              rawPayload: approvedPayment,
            },
          });
        }

        return {
          paid: true,
          paymentId: approvedPayment.id.toString(),
          status: approvedPayment.status,
        };
      }

      return { paid: false };
    } catch (error: any) {
      console.error(
        'Error verificando estado de pago en MP:',
        error.response?.data || error.message,
      );
      // En caso de error, retornar false pero no lanzar excepción
      return { paid: false };
    }
  }

  // ============================================================
  // KIOSK QR ESTÁTICO (POS dedicado para autoservicio)
  // ============================================================

  /**
   * Crea una orden en el QR estático del Kiosko.
   * Usa un POS dedicado (MP_KIOSK_POS_ID) diferente al de caja.
   * El cliente escanea el QR físico del Kiosko y paga.
   */
  async createKioskQrOrder(orderId: number): Promise<{
    success: boolean;
    qrData?: string;
    inStoreOrderId?: string;
    message?: string;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            extras: {
              include: {
                extraOption: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const userId = process.env.MP_USER_ID;
    // Usar POS dedicado del kiosko, o el genérico si no está configurado
    const kioskPosId = process.env.MP_KIOSK_POS_ID || process.env.MP_EXTERNAL_POS_ID;

    // Si no hay configuración de QR estático, usar directamente Checkout Pro
    if (!userId || !kioskPosId) {
      console.log('QR estático no configurado (MP_USER_ID o MP_KIOSK_POS_ID), usando Checkout Pro');
      const checkoutPro = await this.createMpQrForOrder(orderId);
      return {
        success: true,
        qrData: checkoutPro.initPoint,
        message: 'Usando Checkout Pro (QR estático no configurado)',
      };
    }

    // Construir items incluyendo extras
    const items: any[] = [];
    for (const item of order.items) {
      items.push({
        sku_number: item.productId.toString(),
        title: item.product.name,
        unit_price: Number(item.unitPrice),
        quantity: item.quantity,
        unit_measure: 'unit',
        total_amount: Number(item.unitPrice) * item.quantity,
      });

      for (const extra of item.extras) {
        const extraTotal = Number(extra.unitPrice) * extra.quantity * item.quantity;
        if (extraTotal > 0) {
          items.push({
            sku_number: `extra-${extra.extraOptionId}`,
            title: `+ ${extra.extraOption.name}`,
            unit_price: Number(extra.unitPrice),
            quantity: extra.quantity * item.quantity,
            unit_measure: 'unit',
            total_amount: extraTotal,
          });
        }
      }
    }

    const body = {
      external_reference: orderId.toString(),
      title: `Kiosko Pedido #${orderId}`,
      description: `Pedido autoservicio`,
      total_amount: Number(order.totalAmount),
      items,
      notification_url: process.env.MP_WEBHOOK_URL,
      expiration_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min
    };

    try {
      const response = await axios.put(
        `${this.mpApiBase}/instore/qr/seller/collectors/${userId}/pos/${kioskPosId}/orders`,
        body,
        { headers: this.getMpHeaders() },
      );

      console.log(`Orden ${orderId} montada en QR Kiosko (POS: ${kioskPosId}):`, response.data);

      return {
        success: true,
        qrData: response.data.qr_data || '',
        inStoreOrderId: response.data.in_store_order_id || '',
      };
    } catch (error: any) {
      console.error('Error creando orden en QR Kiosko:', error.response?.data || error.message);
      
      // Si falla el QR estático, intentar con checkout pro como fallback
      console.log('Intentando fallback a checkout pro...');
      try {
        const fallback = await this.createMpQrForOrder(orderId);
        return {
          success: true,
          qrData: fallback.initPoint,
          message: 'Usando QR dinámico (checkout pro) como fallback',
        };
      } catch (fallbackError: any) {
        throw new InternalServerErrorException('No se pudo crear el QR de pago para el kiosko');
      }
    }
  }

  /**
   * Elimina la orden actual del QR del Kiosko
   */
  async deleteKioskQrOrder(): Promise<{ deleted: boolean }> {
    const userId = process.env.MP_USER_ID;
    const kioskPosId = process.env.MP_KIOSK_POS_ID || process.env.MP_EXTERNAL_POS_ID;

    if (!userId || !kioskPosId) {
      return { deleted: false };
    }

    try {
      await axios.delete(
        `${this.mpApiBase}/instore/qr/seller/collectors/${userId}/pos/${kioskPosId}/orders`,
        { headers: this.getMpHeaders() },
      );
      console.log(`Orden eliminada del QR Kiosko (POS: ${kioskPosId})`);
      return { deleted: true };
    } catch (error: any) {
      const errorCode = error.response?.data?.error;
      // Si el error es "in_store_order_delete_error", significa que la orden ya fue
      // procesada/pagada y no existe. Esto es normal después de un pago exitoso.
      if (errorCode === 'in_store_order_delete_error') {
        console.log(`QR Kiosko: Orden ya procesada, no hay nada que eliminar (POS: ${kioskPosId})`);
        return { deleted: true }; // Consideramos esto como éxito
      }
      console.error('Error eliminando orden del QR Kiosko:', error.response?.data || error.message);
      return { deleted: false };
    }
  }

  /**
   * Genera el QR del POS del Kiosko para imprimir una sola vez.
   * Este QR es estático - se imprime y pega en el kiosko.
   */
  async getKioskQrImage(): Promise<{ qrData: string; posId: string }> {
    const userId = process.env.MP_USER_ID;
    const kioskPosId = process.env.MP_KIOSK_POS_ID || process.env.MP_EXTERNAL_POS_ID;

    if (!userId || !kioskPosId) {
      throw new InternalServerErrorException('MP_USER_ID o MP_KIOSK_POS_ID no configurados');
    }

    try {
      // Consultar info del POS para obtener el QR
      const response = await axios.get(
        `${this.mpApiBase}/pos/${kioskPosId}`,
        { headers: this.getMpHeaders() },
      );

      return {
        qrData: response.data.qr?.image || response.data.qr_code || '',
        posId: kioskPosId,
      };
    } catch (error: any) {
      console.error('Error obteniendo QR del POS:', error.response?.data || error.message);
      
      // Fallback: construir el QR data manualmente
      // El formato estándar es: https://mpago.la/pos/{pos_id}
      return {
        qrData: `https://mpago.la/pos/${kioskPosId}`,
        posId: kioskPosId,
      };
    }
  }

  /**
   * Verifica el estado del pago para el Kiosko.
   * Más agresivo que checkPaymentStatus - también limpia el QR si se pagó.
   */
  async checkKioskPaymentStatus(orderId: number): Promise<{
    paid: boolean;
    paymentId?: string;
    status: string;
    shouldRetry: boolean;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { paid: false, status: 'NOT_FOUND', shouldRetry: false };
    }

    // Si ya está pagada, limpiar QR y retornar
    if (order.status === 'PAID') {
      await this.deleteKioskQrOrder();
      return { paid: true, status: 'PAID', shouldRetry: false };
    }

    // Si está cancelada o fallida, también retornar para que el kiosko pueda reintentar
    if (order.status === 'CANCELLED' || order.status === 'PAYMENT_FAILED') {
      return { paid: false, status: order.status, shouldRetry: true };
    }

    try {
      // Buscar pagos recientes en MP con el external_reference de esta orden
      const response = await axios.get(
        `${this.mpApiBase}/v1/payments/search`,
        {
          headers: this.getMpHeaders(),
          params: {
            external_reference: orderId.toString(),
            sort: 'date_created',
            criteria: 'desc',
            limit: 5,
          },
        },
      );

      const payments = response.data.results || [];

      // Buscar pago aprobado
      const approvedPayment = payments.find(
        (p: any) => p.status === 'approved',
      );

      if (approvedPayment) {
        console.log(`[Kiosk] Pago aprobado encontrado para orden ${orderId}:`, approvedPayment.id);

        // Actualizar la orden a PAID
        await this.updateOrderStatusWithLog(
          orderId,
          OrderStatus.PAID,
          'kiosk-poll',
          `Pago QR Kiosko confirmado: ${approvedPayment.id}`,
        );

        // Registrar en PaymentLog
        const existingLog = await this.prisma.paymentLog.findFirst({
          where: { mpPaymentId: approvedPayment.id.toString() },
        });

        if (!existingLog) {
          await this.prisma.paymentLog.create({
            data: {
              orderId,
              mpPaymentId: approvedPayment.id.toString(),
              status: approvedPayment.status,
              statusDetail: approvedPayment.status_detail,
              paymentType: approvedPayment.payment_type_id,
              paymentMethod: approvedPayment.payment_method_id,
              operationType: approvedPayment.operation_type,
              transactionAmount: approvedPayment.transaction_amount,
              installments: approvedPayment.installments,
              payerEmail: approvedPayment.payer?.email,
              rawPayload: approvedPayment,
            },
          });
        }

        // Limpiar el QR del kiosko para el próximo pedido
        await this.deleteKioskQrOrder();

        return {
          paid: true,
          paymentId: approvedPayment.id.toString(),
          status: 'PAID',
          shouldRetry: false,
        };
      }

      // Buscar si hay pago rechazado reciente (para mostrar mensaje)
      const rejectedPayment = payments.find(
        (p: any) => p.status === 'rejected' || p.status === 'cancelled',
      );

      if (rejectedPayment) {
        // Actualizar estado pero no cancelar completamente
        await this.updateOrderStatusWithLog(
          orderId,
          OrderStatus.PAYMENT_FAILED,
          'kiosk-poll',
          `Pago rechazado: ${rejectedPayment.status} - ${rejectedPayment.status_detail}`,
        );

        return {
          paid: false,
          status: 'PAYMENT_FAILED',
          shouldRetry: true,
        };
      }

      // Aún pendiente
      return { paid: false, status: 'PENDING', shouldRetry: true };
    } catch (error: any) {
      console.error(
        '[Kiosk] Error verificando pago:',
        error.response?.data || error.message,
      );
      // En caso de error de red, seguir reintentando
      return { paid: false, status: 'ERROR', shouldRetry: true };
    }
  }

  /**
   * Busca todos los pagos recibidos en Mercado Pago (general, no solo vinculados a órdenes)
   * Útil para ver pagos que clientes hicieron escaneando QR estático sin orden
   */
  async searchAllMpPayments(limit: number = 30, offset: number = 0, dateFrom?: string) {
    try {
      // Por defecto buscar del día de hoy
      const today = new Date();
      const from = dateFrom || new Date(today.setHours(0, 0, 0, 0)).toISOString();

      const response = await axios.get(
        `${this.mpApiBase}/v1/payments/search`,
        {
          headers: this.getMpHeaders(),
          params: {
            sort: 'date_created',
            criteria: 'desc',
            limit,
            offset,
            range: 'date_created',
            begin_date: from,
            end_date: new Date().toISOString(),
          },
        },
      );

      const payments = response.data.results || [];
      const total = response.data.paging?.total || payments.length;

      // Para cada pago, buscar si está vinculado a una orden local
      const paymentsWithOrderInfo = await Promise.all(
        payments.map(async (p: any) => {
          // Buscar en PaymentLog si este pago está registrado
          const paymentLog = await this.prisma.paymentLog.findFirst({
            where: { mpPaymentId: p.id.toString() },
            include: {
              order: {
                select: { id: true, status: true, totalAmount: true },
              },
            },
          });

          // También buscar por external_reference
          let linkedOrder = paymentLog?.order || null;
          if (!linkedOrder && p.external_reference) {
            const orderId = parseInt(p.external_reference, 10);
            if (!isNaN(orderId)) {
              const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                select: { id: true, status: true, totalAmount: true },
              });
              linkedOrder = order;
            }
          }

          return {
            id: p.id,
            status: p.status,
            statusDetail: p.status_detail,
            amount: p.transaction_amount,
            currency: p.currency_id,
            paymentType: p.payment_type_id,
            paymentMethod: p.payment_method_id,
            dateCreated: p.date_created,
            dateApproved: p.date_approved,
            externalReference: p.external_reference,
            description: p.description,
            payerEmail: p.payer?.email,
            pointOfInteraction: p.point_of_interaction?.type || null,
            linkedOrder: linkedOrder
              ? {
                  id: linkedOrder.id,
                  status: linkedOrder.status,
                  totalAmount: Number(linkedOrder.totalAmount),
                }
              : null,
            isLinked: !!linkedOrder || !!paymentLog,
          };
        }),
      );

      return {
        payments: paymentsWithOrderInfo,
        total,
        limit,
        offset,
      };
    } catch (error: any) {
      console.error(
        'Error buscando pagos en MP:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException('Error consultando Mercado Pago');
    }
  }
}
