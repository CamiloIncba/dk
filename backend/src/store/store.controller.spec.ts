import { StoreController } from './store.controller';
import { MenuService } from '../menu/menu.service';
import { OrdersService } from '../orders/orders.service';
import { CreateStoreOrderDto } from './dto/create-store-order.dto';

describe('StoreController', () => {
  let controller: StoreController;
  let menuService: jest.Mocked<Pick<MenuService, 'getMenu'>>;
  let ordersService: jest.Mocked<
    Pick<OrdersService, 'createOrder' | 'getOrderById'>
  >;

  beforeEach(() => {
    menuService = {
      getMenu: jest.fn(),
    };

    ordersService = {
      createOrder: jest.fn(),
      getOrderById: jest.fn(),
    };

    controller = new StoreController(
      menuService as unknown as MenuService,
      ordersService as unknown as OrdersService,
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

  it('GET /api/v1/store/orders/:id/status devuelve campos esperados', async () => {
    const createdAt = new Date('2026-03-01T10:00:00.000Z');
    const updatedAt = new Date('2026-03-01T10:10:00.000Z');
    ordersService.getOrderById.mockResolvedValue({
      id: 77,
      status: 'CONFIRMED',
      kitchenStatus: 'IN_PROGRESS',
      totalAmount: 18990,
      createdAt,
      updatedAt,
      items: [],
      note: 'Campo extra que no debe salir en la respuesta',
    } as never);

    const result = await controller.getOrderStatus(77);

    expect(ordersService.getOrderById).toHaveBeenCalledWith(77);
    expect(result).toEqual({
      id: 77,
      status: 'CONFIRMED',
      kitchenStatus: 'IN_PROGRESS',
      totalAmount: 18990,
      createdAt,
      updatedAt,
    });
    expect(result).not.toHaveProperty('items');
    expect(result).not.toHaveProperty('note');
  });
});
