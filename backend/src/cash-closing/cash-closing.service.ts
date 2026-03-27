import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CashClosingSummary {
  // Período
  dateFrom: Date;
  dateTo: Date;
  generatedAt: Date;

  // Totales generales
  totalOrders: number;
  totalSales: number;
  averageTicket: number;

  // Desglose por método de pago
  salesByCash: number;
  salesByMercadoPago: number;
  salesByTransfer: number;
  salesByOtherPos: number;
  salesByManualOther: number;

  ordersByCash: number;
  ordersByMercadoPago: number;
  ordersByTransfer: number;
  ordersByOtherPos: number;
  ordersByManualOther: number;

  // Desglose por estado
  ordersByStatus: {
    status: string;
    count: number;
    total: number;
  }[];

  // Productos más vendidos
  topProducts: {
    productId: number;
    productName: string;
    quantitySold: number;
    totalRevenue: number;
  }[];

  // Ventas por hora
  salesByHour: {
    hour: number;
    orders: number;
    total: number;
  }[];

  // Lista de pedidos del período
  orders: {
    id: number;
    receiptCode: string | null;
    status: string;
    totalAmount: number;
    paymentMethod: string | null;
    createdAt: Date;
  }[];
}

@Injectable()
export class CashClosingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene el resumen del día de hoy
   */
  async getTodaySummary(): Promise<CashClosingSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.generateSummary(today, today);
  }

  /**
   * Genera el resumen de cierre de caja para un período específico
   */
  async generateSummary(dateFrom: Date, dateTo: Date): Promise<CashClosingSummary> {
    // Ajustar dateTo para incluir todo el día
    const dateToEnd = new Date(dateTo);
    dateToEnd.setHours(23, 59, 59, 999);

    // Obtener todos los pedidos pagados del período
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateToEnd,
        },
        status: 'PAID', // Solo pedidos pagados
      },
      include: {
        payments: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular totales
    let totalSales = 0;
    let salesByCash = 0;
    let salesByMercadoPago = 0;
    let salesByTransfer = 0;
    let salesByOtherPos = 0;
    let salesByManualOther = 0;
    
    let ordersByCash = 0;
    let ordersByMercadoPago = 0;
    let ordersByTransfer = 0;
    let ordersByOtherPos = 0;
    let ordersByManualOther = 0;

    const productSales: Map<number, { name: string; quantity: number; revenue: number }> = new Map();
    const hourSales: Map<number, { orders: number; total: number }> = new Map();

    for (const order of orders) {
      const amount = Number(order.totalAmount);
      totalSales += amount;

      // Determinar método de pago
      // Buscar el pago asociado (puede ser de MP o manual)
      const payment = order.payments.find(p => p.status === 'approved' || p.status === 'manual_approved');
      let paymentMethod = 'unknown';

      if (payment) {
        if (payment.isManual) {
          // Pago manual - categorizar según la razón
          // manualReason guarda la KEY: 'CASH', 'TRANSFER', 'OTHER_POS', 'MP_VERIFIED', 'OTHER'
          const reason = payment.manualReason?.toUpperCase() || '';
          
          if (reason === 'CASH') {
            paymentMethod = 'cash';
            salesByCash += amount;
            ordersByCash++;
          } else if (reason === 'TRANSFER') {
            paymentMethod = 'transfer';
            salesByTransfer += amount;
            ordersByTransfer++;
          } else if (reason === 'OTHER_POS') {
            paymentMethod = 'other_pos';
            salesByOtherPos += amount;
            ordersByOtherPos++;
          } else if (reason === 'MP_VERIFIED') {
            // MP verificado manualmente se cuenta como Mercado Pago
            paymentMethod = 'mercadopago';
            salesByMercadoPago += amount;
            ordersByMercadoPago++;
          } else {
            // OTHER u otro motivo
            paymentMethod = 'manual_other';
            salesByManualOther += amount;
            ordersByManualOther++;
          }
        } else {
          // Pago automático de Mercado Pago
          paymentMethod = 'mercadopago';
          salesByMercadoPago += amount;
          ordersByMercadoPago++;
        }
      } else {
        // No tiene pago registrado pero está PAID
        // Esto puede pasar si se marcó PAID sin crear PaymentLog
        // Lo contamos como "otro" para no perder la venta
        paymentMethod = 'unknown';
        salesByManualOther += amount;
        ordersByManualOther++;
      }

      // Agregar a productos
      for (const item of order.items) {
        const existing = productSales.get(item.productId);
        const itemRevenue = Number(item.unitPrice) * item.quantity;
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += itemRevenue;
        } else {
          productSales.set(item.productId, {
            name: item.product.name,
            quantity: item.quantity,
            revenue: itemRevenue,
          });
        }
      }

      // Agregar a ventas por hora
      const hour = new Date(order.createdAt).getHours();
      const existingHour = hourSales.get(hour);
      if (existingHour) {
        existingHour.orders++;
        existingHour.total += amount;
      } else {
        hourSales.set(hour, { orders: 1, total: amount });
      }
    }

    // Obtener conteo por estado (incluye no pagados para referencia)
    const allOrdersInPeriod = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateToEnd,
        },
      },
      select: {
        status: true,
        totalAmount: true,
      },
    });

    const statusCounts: Map<string, { count: number; total: number }> = new Map();
    for (const order of allOrdersInPeriod) {
      const existing = statusCounts.get(order.status);
      if (existing) {
        existing.count++;
        existing.total += Number(order.totalAmount);
      } else {
        statusCounts.set(order.status, { count: 1, total: Number(order.totalAmount) });
      }
    }

    // Convertir a arrays
    const topProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantitySold: data.quantity,
        totalRevenue: data.revenue,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    const salesByHour = Array.from(hourSales.entries())
      .map(([hour, data]) => ({
        hour,
        orders: data.orders,
        total: data.total,
      }))
      .sort((a, b) => a.hour - b.hour);

    const ordersByStatus = Array.from(statusCounts.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      total: data.total,
    }));

    // Preparar lista de pedidos para el resumen
    const ordersList = orders.map(order => {
      const payment = order.payments.find(p => p.status === 'approved' || p.status === 'manual_approved');
      let paymentMethod: string | null = null;
      
      if (payment) {
        if (payment.isManual) {
          const reason = payment.manualReason?.toUpperCase() || '';
          if (reason === 'CASH') {
            paymentMethod = 'Efectivo';
          } else if (reason === 'TRANSFER') {
            paymentMethod = 'Transferencia';
          } else if (reason === 'OTHER_POS') {
            paymentMethod = 'Otro Posnet';
          } else if (reason === 'MP_VERIFIED') {
            paymentMethod = 'MP (Manual)';
          } else {
            paymentMethod = 'Manual';
          }
        } else {
          paymentMethod = 'Mercado Pago';
        }
      }
      
      return {
        id: order.id,
        receiptCode: order.receiptCode,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        paymentMethod,
        createdAt: order.createdAt,
      };
    });

    return {
      dateFrom,
      dateTo: dateToEnd,
      generatedAt: new Date(),
      totalOrders: orders.length,
      totalSales,
      averageTicket: orders.length > 0 ? totalSales / orders.length : 0,
      salesByCash,
      salesByMercadoPago,
      salesByTransfer,
      salesByOtherPos,
      salesByManualOther,
      ordersByCash,
      ordersByMercadoPago,
      ordersByTransfer,
      ordersByOtherPos,
      ordersByManualOther,
      ordersByStatus,
      topProducts,
      salesByHour,
      orders: ordersList,
    };
  }
}