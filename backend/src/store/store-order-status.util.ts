import { KitchenStatus, OrderStatus } from '@prisma/client';

export type StoreTimelineStep = {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
};

const PAYMENT_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Pendiente de pago',
  [OrderStatus.PAID]: 'Pagado',
  [OrderStatus.CANCELLED]: 'Cancelado',
  [OrderStatus.PAYMENT_FAILED]: 'Pago no completado',
};

const KITCHEN_LABELS: Record<KitchenStatus, string> = {
  [KitchenStatus.PENDING]: 'En espera de preparación',
  [KitchenStatus.IN_PREPARATION]: 'En preparación',
  [KitchenStatus.READY]: 'Listo para entregar',
  [KitchenStatus.DELIVERED]: 'Entregado',
  [KitchenStatus.CANCELLED]: 'Cancelado',
};

function buildTimeline(
  status: OrderStatus,
  kitchen: KitchenStatus,
): StoreTimelineStep[] {
  if (status === OrderStatus.CANCELLED || kitchen === KitchenStatus.CANCELLED) {
    return [
      { id: 'placed', label: 'Pedido recibido', done: true, current: false },
      { id: 'cancelled', label: 'Pedido cancelado', done: true, current: true },
    ];
  }

  if (status === OrderStatus.PAYMENT_FAILED) {
    return [
      { id: 'placed', label: 'Pedido recibido', done: true, current: false },
      {
        id: 'payment_failed',
        label: 'Hubo un problema con el pago',
        done: true,
        current: true,
      },
    ];
  }

  const paid = status === OrderStatus.PAID;
  const cookingCurrent =
    paid &&
    (kitchen === KitchenStatus.PENDING ||
      kitchen === KitchenStatus.IN_PREPARATION);
  const readyCurrent = paid && kitchen === KitchenStatus.READY;
  const deliveredCurrent = paid && kitchen === KitchenStatus.DELIVERED;

  const steps: StoreTimelineStep[] = [
    {
      id: 'placed',
      label: 'Pedido recibido',
      done: true,
      current: false,
    },
    {
      id: 'payment',
      label: 'Pago confirmado',
      done: paid,
      current: !paid && status === OrderStatus.PENDING,
    },
    {
      id: 'cooking',
      label:
        kitchen === KitchenStatus.PENDING
          ? 'En cola de cocina'
          : 'En preparación',
      done:
        paid &&
        (kitchen === KitchenStatus.READY ||
          kitchen === KitchenStatus.DELIVERED),
      current: cookingCurrent,
    },
    {
      id: 'ready',
      label: 'Listo para entregar',
      done:
        paid &&
        (kitchen === KitchenStatus.READY ||
          kitchen === KitchenStatus.DELIVERED),
      current: readyCurrent,
    },
    {
      id: 'delivered',
      label: 'Entregado',
      done: paid && kitchen === KitchenStatus.DELIVERED,
      current: deliveredCurrent,
    },
  ];

  return steps;
}

export function buildStoreStatusPayload(order: {
  id: number;
  status: OrderStatus;
  kitchenStatus: KitchenStatus;
  totalAmount: unknown;
  createdAt: Date;
  updatedAt: Date;
  items?: Array<{
    quantity: number;
    product: { name: string };
    extras?: Array<{ quantity: number; extraOption: { name: string } }>;
  }>;
}) {
  const lineItems = order.items?.map((item) => ({
    quantity: item.quantity,
    productName: item.product.name,
    extras:
      item.extras?.map((e) => ({
        name: e.extraOption.name,
        quantity: e.quantity,
      })) ?? [],
  }));

  return {
    id: order.id,
    status: order.status,
    kitchenStatus: order.kitchenStatus,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paymentLabel: PAYMENT_LABELS[order.status],
    kitchenLabel: KITCHEN_LABELS[order.kitchenStatus],
    timeline: buildTimeline(order.status, order.kitchenStatus),
    lineItems,
  };
}
