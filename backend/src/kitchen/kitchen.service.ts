import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class KitchenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devuelve órdenes que ya están pagadas y que todavía
   * están pendientes o en preparación en la cocina.
   */
  async getActiveKitchenOrders() {
    return this.prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        kitchenStatus: {
          in: [KitchenStatus.PENDING, KitchenStatus.IN_PREPARATION],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        items: {
          include: {
            product: true,
            extras: {
              include: { extraOption: true },
            },
          },
        },
      },
    });
  }

  /**
   * Devuelve órdenes pagadas que están listas para retirar (READY).
   */
  async getReadyKitchenOrders() {
    return this.prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        kitchenStatus: KitchenStatus.READY,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        items: {
          include: {
            product: true,
            extras: {
              include: { extraOption: true },
            },
          },
        },
      },
    });
  }

  /**
   * Actualiza el estado de cocina de una orden.
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
      throw new NotFoundException('Orden no encontrada');
    }

    const previousStatus = order.kitchenStatus;

    // Actualizar estado y registrar en log de auditoría
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
          source: options?.source || 'kitchen-app',
          changedBy: options?.changedBy,
          notes: options?.notes,
        },
      }),
    ]);

    return updated;
  }

  /**
   * Devuelve datos mínimos para la pantalla pública de pedidos.
   * Solo muestra receiptCode y estado, sin detalles de items.
   * Filtra solo pedidos del día actual.
   * Limita "ready" a los últimos 6 para no saturar la pantalla.
   */
  async getDisplayOrders() {
    // Inicio del día actual (00:00:00)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const inPreparation = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        kitchenStatus: {
          in: [KitchenStatus.PENDING, KitchenStatus.IN_PREPARATION],
        },
        createdAt: {
          gte: todayStart,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        receiptCode: true,
        kitchenStatus: true,
        createdAt: true,
      },
    });

    // Solo los últimos 6 pedidos listos (los más recientes)
    const ready = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        kitchenStatus: KitchenStatus.READY,
        createdAt: {
          gte: todayStart,
        },
      },
      orderBy: {
        createdAt: 'desc', // Más recientes primero
      },
      take: 6, // Limitar a 6
      select: {
        id: true,
        receiptCode: true,
        kitchenStatus: true,
        createdAt: true,
      },
    });

    return {
      inPreparation,
      ready: ready.reverse(), // Volver a ordenar cronológicamente para mostrar
      generatedAt: new Date().toISOString(),
    };
  }
}
