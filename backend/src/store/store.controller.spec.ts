import { KitchenStatus, OrderStatus } from '@prisma/client';
import { StoreController } from './store.controller';
import { MenuService } from '../menu/menu.service';
import { OrdersService } from '../orders/orders.service';
import { ExtrasService } from '../extras/extras.service';
import { CreateStoreOrderDto } from './dto/create-store-order.dto';

describe('StoreController', () => {
  let controller: StoreController;
  let menuService: jest.Mocked<Pick<MenuService, 'getMenu'>>;
  let ordersService: jest.Mocked<
    Pick<OrdersService, 'createOrder' | 'getOrderById'>
  >;
  let extrasService: jest.Mocked<Pick<ExtrasService, 'getProductExtras'>>;

  beforeEach(() => {
    menuService = {
      getMenu: jest.fn(),
    };

    ordersService = {
      createOrder: jest.fn(),
      getOrderById: jest.fn(),
    };

    extrasService = {
      getProductExtras: jest.fn(),
    };

    controller = new StoreController(
      menuService as unknown as MenuService,
      ordersService as unknown as OrdersService,
      extrasService as unknown as ExtrasService,
    );
  });

  it('GET /api/v1/store/menu devuelve menu', async () => {
    const menu = {
      categories: [{ id: 1, name: 'Combos', products: [{ id: 10, name: 'Combo 1' }] }],
    };
    menuService.getMenu.mockResolvedValue(menu as never);

    const result = await controller.getMenu();

    expect(menuService.getMenu).toHaveBeenCalledTimes(1);
    expect(result).toEqual(menu);
  });

  it('POST /api/v1/store/orders transforma nota con [CHANNEL:WEB_STORE]', async () => {
    const dto: CreateStoreOrderDto = {
      items: [{ productId: 10, quantity: 2 }],
      note: 'Sin cebolla',
      paymentMethod: 'CARD',
      customer: {
        name: 'Ana',
        phone: '+56912345678',
        address: 'Av. Principal 123',
      },
    };
    const createdOrder = { id: 99, status: 'PENDING' };
    ordersService.createOrder.mockResolvedValue(createdOrder as never);

    const result = await controller.createOrder(dto);

    expect(ordersService.createOrder).toHaveBeenCalledTimes(1);
    expect(ordersService.createOrder).toHaveBeenCalledWith({
      items: dto.items,
      note: '[CHANNEL:WEB_STORE] | Cliente: Ana | Telefono: +56912345678 | Direccion: Av. Principal 123 | Pago: CARD | Nota: Sin cebolla',
    });
    expect(result).toEqual(createdOrder);
  });

  it('GET /api/v1/store/orders/:id/status incluye timeline y sin nota cruda', async () => {
    const createdAt = new Date('2026-03-01T10:00:00.000Z');
    const updatedAt = new Date('2026-03-01T10:10:00.000Z');
    ordersService.getOrderById.mockResolvedValue({
      id: 77,
      status: OrderStatus.PAID,
      kitchenStatus: KitchenStatus.READY,
      totalAmount: 18990,
      createdAt,
      updatedAt,
      items: [
        {
          quantity: 1,
          product: { name: 'Pizza' },
          extras: [{ quantity: 1, extraOption: { name: 'Extra queso' } }],
        },
      ],
      note: 'Interno',
    } as never);

    const result = await controller.getOrderStatus(77);

    expect(ordersService.getOrderById).toHaveBeenCalledWith(77);
    expect(result.id).toBe(77);
    expect(result.status).toBe(OrderStatus.PAID);
    expect(result.kitchenStatus).toBe(KitchenStatus.READY);
    expect(result.paymentLabel).toBeDefined();
    expect(result.kitchenLabel).toBeDefined();
    expect(Array.isArray(result.timeline)).toBe(true);
    expect(result.lineItems).toEqual([
      {
        quantity: 1,
        productName: 'Pizza',
        extras: [{ name: 'Extra queso', quantity: 1 }],
      },
    ]);
    expect(result).not.toHaveProperty('note');
  });
});
