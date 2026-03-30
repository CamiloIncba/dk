import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItemDto } from './dto/order-item.dto';
import { OrderStatus, Prisma } from '@prisma/client';

type OrderItemCreateInput = {
  product: { connect: { id: number } };
  quantity: number;
  unitPrice: Prisma.Decimal;
  extras?:
    | {
        create: Array<{
          extraOptionId: number;
          quantity: number;
          unitPrice: number;
        }>;
      }
    | undefined;
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async quoteItems(items: OrderItemDto[]) {
    const { totalAmount, quoteLines } = await this.validateAndPriceItems(items);
    return {
      totalAmount,
      lines: quoteLines,
    };
  }

  async createOrder(dto: CreateOrderDto) {
    const { totalAmount, orderItemCreates } = await this.validateAndPriceItems(
      dto.items,
    );

    const order = await this.prisma.order.create({
      data: {
        status: OrderStatus.PENDING,
        totalAmount: 0,
        note: dto.note,
        channel: dto.channel ?? undefined,
        items: { create: orderItemCreates },
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

    await this.prisma.order.update({
      where: { id: order.id },
      data: { totalAmount },
    });

    return { ...order, totalAmount };
  }

  private async validateAndPriceItems(items: OrderItemDto[]) {
    if (!items || items.length === 0) {
      throw new BadRequestException('La orden debe tener al menos un ítem');
    }

    const productIds = items.map((item) => item.productId);
    const uniqueProductIds = [...new Set(productIds)];

    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueProductIds }, active: true },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new NotFoundException(
        'Uno o más productos no existen o están inactivos',
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    const allExtraOptionIds = new Set<number>();
    items.forEach((item) => {
      item.extras?.forEach((e) => allExtraOptionIds.add(e.optionId));
    });

    let extraOptionsMap = new Map<
      number,
      { id: number; price: number; name: string }
    >();
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
      if (extraOptionsMap.size !== allExtraOptionIds.size) {
        throw new NotFoundException(
          'Uno o más extras no existen o están inactivos',
        );
      }
    }

    let totalAmount = 0;
    const quoteLines: Array<{
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      extras: Array<{
        optionId: number;
        name: string;
        quantity: number;
        unitPrice: number;
      }>;
    }> = [];

    const orderItemCreates: OrderItemCreateInput[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Producto ${item.productId} no encontrado`);
      }
      if (item.quantity <= 0) {
        throw new BadRequestException(
          `Cantidad inválida para producto ${item.productId}`,
        );
      }

      const unitPriceNum = Number(product.price);
      let lineTotal = unitPriceNum * item.quantity;

      const quoteExtras: Array<{
        optionId: number;
        name: string;
        quantity: number;
        unitPrice: number;
      }> = [];

      const extrasData = (item.extras || []).map((e) => {
        const option = extraOptionsMap.get(e.optionId);
        if (!option) {
          throw new NotFoundException(`Extra ${e.optionId} no encontrado`);
        }
        const extraQty = e.quantity ?? 1;
        const extraPrice = option.price;
        lineTotal += extraPrice * extraQty * item.quantity;
        quoteExtras.push({
          optionId: e.optionId,
          name: option.name,
          quantity: extraQty,
          unitPrice: extraPrice,
        });
        return {
          extraOptionId: e.optionId,
          quantity: extraQty,
          unitPrice: extraPrice,
        };
      });

      totalAmount += lineTotal;

      quoteLines.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: unitPriceNum,
        lineTotal,
        extras: quoteExtras,
      });

      orderItemCreates.push({
        product: { connect: { id: item.productId } },
        quantity: item.quantity,
        unitPrice: product.price,
        extras:
          extrasData.length > 0 ? { create: extrasData } : undefined,
      });
    }

    return { totalAmount, quoteLines, orderItemCreates };
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
