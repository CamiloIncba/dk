import { OrderItemDto } from '../../orders/dto/order-item.dto';

export class StoreCustomerDto {
  name?: string;
  phone?: string;
  address?: string;
}

export class CreateStoreOrderDto {
  items: OrderItemDto[];
  note?: string;
  paymentMethod?: string;
  customer?: StoreCustomerDto;
}
