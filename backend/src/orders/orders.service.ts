import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La orden debe tener al menos un ítem');
    }

    // Traer productos y calcular total
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException(
        'Uno o más productos no existen o están inactivos',
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Recolectar todos los optionIds para validar y obtener precios
    const allExtraOptionIds = new Set<number>();
    dto.items.forEach((item) => {
      item.extras?.forEach((e) => allExtraOptionIds.add(e.optionId));
    });

    // Traer opciones de extras si hay
    let extraOptionsMap = new Map<number, { id: number; price: number; name: string }>();
    if (allExtraOptionIds.size > 0) {
      const extraOptions = await this.prisma.extraOption.findMany({
        where: { id: { in: Array.from(allExtraOptionIds) }, active: true },
      });
      extraOptionsMap = new Map(
        extraOptions.map((o) => [
          o.id,
          { id: o.id, price: Number(o.price), name: o.name },
        ]),
      );
    }

    let totalAmount = 0;

    // Crear orden con items y extras
    const order = await this.prisma.order.create({
      data: {
        status: OrderStatus.PENDING,
        totalAmount: 0, // Se actualiza después
        note: dto.note,
        items: {
          create: dto.items.map((item) => {
            const product = productMap.get(item.productId);
            if (!product) {
              throw new NotFoundException(`Producto ${item.productId} no encontrado`);
            }
            if (item.quantity <= 0) {
              throw new BadRequestException(`Cantidad inválida para producto ${item.productId}`);
            }

            const unitPrice = Number(product.price);
            let lineTotal = unitPrice * item.quantity;

            // Preparar extras para este item
            const extrasData = (item.extras || []).map((e) => {
              const option = extraOptionsMap.get(e.optionId);
              if (!option) {
                throw new NotFoundException(`Extra ${e.optionId} no encontrado`);
              }
              const extraQty = e.quantity || 1;
              const extraPrice = option.price;
              lineTotal += extraPrice * extraQty * item.quantity; // Multiplicar por cantidad del producto
              return {
                extraOptionId: e.optionId,
                quantity: extraQty,
                unitPrice: extraPrice,
              };
            });

            totalAmount += lineTotal;

            return {
              product: { connect: { id: item.productId } },
              quantity: item.quantity,
              unitPrice: product.price,
              extras: extrasData.length > 0 ? { create: extrasData } : undefined,
            };
          }),
        },
      },
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

    // Actualizar el total
    await this.prisma.order.update({
      where: { id: order.id },
      data: { totalAmount },
    });

    return { ...order, totalAmount };
  }

  async getOrderById(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
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

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    return order;
  }

  async listRecentOrders(limit = 20) {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
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
}
