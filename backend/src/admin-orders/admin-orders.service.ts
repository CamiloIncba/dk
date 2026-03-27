import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, KitchenStatus } from '@prisma/client';

// Razones válidas para pago manual
export const MANUAL_PAYMENT_REASONS = {
  MP_VERIFIED: 'DINERO LLEGÓ A CUENTA MERCADO PAGO - VERIFICADO MANUALMENTE',
  TRANSFER: 'PAGO POR TRANSFERENCIA BANCARIA',
  CASH: 'PAGO EN EFECTIVO',
  OTHER_POS: 'PAGO CON OTRO POSNET',
  OTHER: 'OTRO MOTIVO',
} as const;

export type ManualPaymentReason = keyof typeof MANUAL_PAYMENT_REASONS;

export interface ManualPaymentDto {
  reason: ManualPaymentReason;
  notes?: string;
  approvedBy?: string;
  source?: string;  // 'cashier-pwa', 'android-kiosk', etc.
}

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devuelve los últimos pedidos creados, ordenados de más nuevo a más viejo.
   * 
   * Más adelante podemos filtrar por:
   * - pedidos con intento de pago (mpPreferenceId no nulo)
   * - estados concretos (PENDING_PAYMENT, PAYMENT_FAILED, PAID, etc.)
   */
  async getRecentOrders(limit: number = 20) {
    const safeLimit =
      !Number.isNaN(limit) && limit > 0 && limit <= 100 ? limit : 20;

    const orders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        status: true,
        kitchenStatus: true,
        createdAt: true,
        totalAmount: true,
        receiptCode: true,
      },
    });

    return orders;
  }

  /**
   * Marca un pedido como pagado manualmente.
   * Requiere justificación para auditoría.
   */
  async markPaidManual(orderId: number, dto: ManualPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('El pedido ya está pagado');
    }

    // Validar razón
    if (!dto.reason || !MANUAL_PAYMENT_REASONS[dto.reason]) {
      throw new BadRequestException(
        `Razón inválida. Valores válidos: ${Object.keys(MANUAL_PAYMENT_REASONS).join(', ')}`,
      );
    }

    // Generar código de recibo si no tiene
    const receiptCode = order.receiptCode || this.generateReceiptCode();
    const manualPaymentId = `MANUAL-${Date.now()}`;

    // Crear registro de pago manual para auditoría
    await this.prisma.paymentLog.create({
      data: {
        orderId,
        mpPaymentId: manualPaymentId,
        status: 'manual_approved',
        statusDetail: MANUAL_PAYMENT_REASONS[dto.reason],
        paymentType: dto.reason === 'CASH' ? 'cash' : dto.reason === 'TRANSFER' ? 'transfer' : 'manual',
        paymentMethod: 'manual',
        operationType: 'manual',
        transactionAmount: order.totalAmount,
        isManual: true,
        manualReason: dto.reason,
        manualApprovedBy: dto.approvedBy || 'cajero',
        manualNotes: dto.notes || null,
        rawPayload: {
          type: 'manual_payment',
          reason: dto.reason,
          reasonDescription: MANUAL_PAYMENT_REASONS[dto.reason],
          notes: dto.notes,
          approvedBy: dto.approvedBy,
          timestamp: new Date().toISOString(),
        },
      },
    });

    const previousStatus = order.status;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        receiptCode,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Registrar cambio de estado en log de auditoría
    await this.prisma.orderStatusLog.create({
      data: {
        orderId,
        fieldChanged: 'status',
        previousValue: previousStatus,
        newValue: OrderStatus.PAID,
        source: dto.source || 'cashier-pwa',
        changedBy: dto.approvedBy || 'cajero',
        notes: `Pago manual: ${MANUAL_PAYMENT_REASONS[dto.reason]}${dto.notes ? ` - ${dto.notes}` : ''}`,
      },
    });

    return updated;
  }

  /**
   * Marca un pedido como pagado en efectivo.
   * @deprecated Usar markPaidManual con reason: 'CASH' para auditoría
   */
  async markPaidCash(orderId: number) {
    return this.markPaidManual(orderId, { reason: 'CASH', notes: 'Método legacy' });
  }

  /**
   * Actualiza el estado de cocina de un pedido.
   * Registra el cambio en el log de auditoría.
   */
  async updateKitchenStatus(
    orderId: number,
    status: string,
    options?: { source?: string; changedBy?: string; notes?: string },
  ) {
    const allowed: KitchenStatus[] = [
      KitchenStatus.PENDING,
      KitchenStatus.IN_PREPARATION,
      KitchenStatus.READY,
      KitchenStatus.DELIVERED,
      KitchenStatus.CANCELLED,
    ];

    const normalized = status.toUpperCase() as KitchenStatus;

    if (!allowed.includes(normalized)) {
      throw new BadRequestException(
        `Estado de cocina inválido: ${status}. Valores válidos: ${allowed.join(', ')}`,
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const previousStatus = order.kitchenStatus;

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          kitchenStatus: normalized,
        },
      }),
      this.prisma.orderStatusLog.create({
        data: {
          orderId,
          fieldChanged: 'kitchenStatus',
          previousValue: previousStatus,
          newValue: normalized,
          source: options?.source || 'cashier-pwa',
          changedBy: options?.changedBy,
          notes: options?.notes,
        },
      }),
    ]);

    return updated;
  }

  private generateReceiptCode(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Devuelve pedidos con información completa para auditoría
   */
  async getOrdersForAudit(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      dateFrom?: Date;
      dateTo?: Date;
      status?: string;
      paymentMethod?: string;
      search?: string;
    },
  ) {
    // Construir condiciones WHERE
    const where: any = {};

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        dateTo.setHours(23, 59, 59, 999);
        where.createdAt.lte = dateTo;
      }
    }

    if (filters?.status) {
      where.status = filters.status as OrderStatus;
    }

    if (filters?.search) {
      // Buscar por código de ticket o ID
      const searchNum = parseInt(filters.search);
      if (!isNaN(searchNum)) {
        where.OR = [{ id: searchNum }, { receiptCode: { contains: filters.search } }];
      } else {
        where.receiptCode = { contains: filters.search };
      }
    }

    // Filtro por método de pago requiere lógica especial
    let paymentFilter: any = undefined;
    if (filters?.paymentMethod) {
      if (filters.paymentMethod === 'cash') {
        paymentFilter = {
          some: {
            isManual: true,
            manualReason: { contains: 'EFECTIVO' },
          },
        };
      } else if (filters.paymentMethod === 'mercadopago') {
        paymentFilter = {
          some: {
            isManual: false,
            status: 'approved',
          },
        };
      } else if (filters.paymentMethod === 'manual') {
        paymentFilter = {
          some: {
            isManual: true,
            manualReason: { not: { contains: 'EFECTIVO' } },
          },
        };
      }
      if (paymentFilter) {
        where.payments = paymentFilter;
      }
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        items: {
          include: {
            product: true,
            extras: {
              include: { extraOption: true },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        statusLogs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const total = await this.prisma.order.count({ where });

    return {
      orders: orders.map((order) => ({
        ...order,
        totalAmount: Number(order.totalAmount),
        items: order.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          extras: item.extras.map((e) => ({
            ...e,
            unitPrice: Number(e.unitPrice),
          })),
        })),
        payments: order.payments.map((p) => ({
          ...p,
          transactionAmount: p.transactionAmount ? Number(p.transactionAmount) : null,
        })),
        statusLogs: order.statusLogs,
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Devuelve todos los movimientos de Mercado Pago para auditoría
   */
  async getMercadoPagoMovements(limit: number = 50, offset: number = 0) {
    const payments = await this.prisma.paymentLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        order: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    });

    const total = await this.prisma.paymentLog.count();

    // Para cada pago, buscar el source del OrderStatusLog
    const orderIds = payments.map(p => p.orderId).filter(Boolean);
    const statusLogs = await this.prisma.orderStatusLog.findMany({
      where: {
        orderId: { in: orderIds },
        newValue: 'PAID',
      },
      select: {
        orderId: true,
        source: true,
      },
    });

    const sourceByOrderId: Record<number, string> = {};
    statusLogs.forEach(log => {
      if (log.orderId && log.source) {
        sourceByOrderId[log.orderId] = log.source;
      }
    });

    // Determinar el origen del pago
    const paymentsWithOrigin = payments.map((p) => {
      let origin = 'Desconocido';
      const rawPayload = p.rawPayload as Record<string, unknown> | null;
      const orderSource = p.orderId ? sourceByOrderId[p.orderId] : null;
      
      if (p.isManual) {
        origin = 'Pago Manual';
      } else if (orderSource) {
        // Usar el source del OrderStatusLog para determinar origen
        if (orderSource.includes('kiosk')) {
          origin = 'Kiosko (QR)';
        } else if (orderSource.includes('point') || orderSource === 'mp-point') {
          origin = 'Caja (Point)';
        } else if (orderSource.includes('webhook')) {
          // Webhook - determinar por point_of_interaction
          const poi = rawPayload?.point_of_interaction as Record<string, unknown> | undefined;
          if (poi?.type === 'INSTORE') {
            origin = 'Kiosko (QR)';
          } else {
            origin = 'MP: Checkout';
          }
        } else if (orderSource.includes('qr-poll') || orderSource === 'mp-qr-poll') {
          origin = 'QR Dinámico';
        } else {
          origin = `MP: ${orderSource}`;
        }
      } else if (rawPayload?.point_of_interaction) {
        // Fallback: usar point_of_interaction del pago
        const poi = rawPayload.point_of_interaction as Record<string, unknown>;
        if (poi.type === 'INSTORE') {
          origin = 'Kiosko (QR)';
        } else if (poi.type === 'POS') {
          origin = 'Caja (Point)';
        } else if (poi.type === 'OPENPLATFORM') {
          origin = 'QR Dinámico';
        } else {
          origin = `MP: ${poi.type || 'Otro'}`;
        }
      } else if (p.operationType === 'regular_payment') {
        origin = 'QR / Checkout';
      }

      return {
        id: p.id,
        mpPaymentId: p.mpPaymentId,
        status: p.status,
        statusDetail: p.statusDetail,
        paymentType: p.paymentType,
        paymentMethod: p.paymentMethod,
        transactionAmount: p.transactionAmount ? Number(p.transactionAmount) : null,
        isManual: p.isManual,
        manualReason: p.manualReason,
        manualApprovedBy: p.manualApprovedBy,
        manualNotes: p.manualNotes,
        origin,
        createdAt: p.createdAt,
        order: p.order ? {
          id: p.order.id,
          status: p.order.status,
          totalAmount: Number(p.order.totalAmount),
          createdAt: p.order.createdAt,
        } : null,
      };
    });

    return {
      payments: paymentsWithOrigin,
      total,
      limit,
      offset,
    };
  }

  /**
   * Devuelve las razones disponibles para pago manual
   */
  getManualPaymentReasons() {
    return MANUAL_PAYMENT_REASONS;
  }
}
