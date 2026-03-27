import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  averageTicket: number;
  pendingOrders: number;
  yesterdaySales: number;
  salesGrowth: number;
  salesByHour: { hour: string; sales: number; orders: number }[];
  salesByDay: { date: string; sales: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  paymentMethods: { method: string; count: number; total: number }[];
  ordersByStatus: { status: string; count: number }[];
}

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  private toNumber(val: Decimal | number): number {
    return typeof val === 'number' ? val : Number(val);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // Órdenes de hoy (solo pagadas)
    const todayOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart },
        status: 'PAID',
      },
      include: { 
        items: { include: { product: true } },
        payments: true,
      },
    });

    // Órdenes de ayer (solo pagadas)
    const yesterdayOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: yesterdayStart, lt: todayStart },
        status: 'PAID',
      },
    });

    // Calcular totales
    const todaySales = todayOrders.reduce((sum, o) => sum + this.toNumber(o.totalAmount), 0);
    const yesterdaySales = yesterdayOrders.reduce((sum, o) => sum + this.toNumber(o.totalAmount), 0);
    const salesGrowth = yesterdaySales > 0 
      ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 
      : todaySales > 0 ? 100 : 0;

    // Órdenes pendientes (status PENDING o en cocina)
    const pendingOrders = await this.prisma.order.count({
      where: { 
        OR: [
          { status: 'PENDING' },
          { status: 'PAID', kitchenStatus: { in: ['PENDING', 'IN_PREPARATION'] } },
        ],
      },
    });

    // Ventas por hora (últimas 24h)
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const hourlyOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: last24h },
        status: 'PAID',
      },
    });

    const salesByHour: { hour: string; sales: number; orders: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const hourLabel = `${i.toString().padStart(2, '0')}:00`;
      const ordersInHour = hourlyOrders.filter(o => {
        const orderHour = new Date(o.createdAt).getHours();
        return orderHour === i;
      });
      salesByHour.push({
        hour: hourLabel,
        sales: ordersInHour.reduce((sum, o) => sum + this.toNumber(o.totalAmount), 0),
        orders: ordersInHour.length,
      });
    }

    // Ventas de la semana
    const weekOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: weekStart },
        status: 'PAID',
      },
    });

    const salesByDay: { date: string; sales: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(todayStart);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const ordersInDay = weekOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= date && orderDate < nextDate;
      });
      
      salesByDay.push({
        date: date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
        sales: ordersInDay.reduce((sum, o) => sum + this.toNumber(o.totalAmount), 0),
        orders: ordersInDay.length,
      });
    }

    // Top productos del día
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const order of todayOrders) {
      for (const item of order.items) {
        const key = item.productId.toString();
        if (!productSales[key]) {
          productSales[key] = { name: item.product.name, quantity: 0, revenue: 0 };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += this.toNumber(item.unitPrice) * item.quantity;
      }
    }
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Métodos de pago (desde PaymentLog)
    const paymentMethods: { method: string; count: number; total: number }[] = [];
    const methodGroups: Record<string, { count: number; total: number }> = {};
    for (const order of todayOrders) {
      // Usar el primer pago aprobado de la orden
      const approvedPayment = order.payments.find(p => p.status === 'approved');
      const method = approvedPayment?.isManual ? 'MANUAL' : 
                    approvedPayment ? 'MERCADO_PAGO' : 'UNKNOWN';
      if (!methodGroups[method]) {
        methodGroups[method] = { count: 0, total: 0 };
      }
      methodGroups[method].count++;
      methodGroups[method].total += this.toNumber(order.totalAmount);
    }
    for (const [method, data] of Object.entries(methodGroups)) {
      paymentMethods.push({ method, ...data });
    }

    // Órdenes por estado (kitchenStatus para hoy)
    const statusCounts = await this.prisma.order.groupBy({
      by: ['kitchenStatus'],
      where: { createdAt: { gte: todayStart } },
      _count: { id: true },
    });
    const ordersByStatus = statusCounts.map(s => ({
      status: s.kitchenStatus,
      count: s._count.id,
    }));

    return {
      todaySales,
      todayOrders: todayOrders.length,
      averageTicket: todayOrders.length > 0 ? todaySales / todayOrders.length : 0,
      pendingOrders,
      yesterdaySales,
      salesGrowth,
      salesByHour,
      salesByDay,
      topProducts,
      paymentMethods,
      ordersByStatus,
    };
  }
}
