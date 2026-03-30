import { OrderItemDto } from '../../orders/dto/order-item.dto';

export class StoreCustomerDto {
  name?: string;
  phone?: string;
  address?: string;
}

/** Slug de la tienda web (Fersot / Stone Fungus); se refleja en la nota del pedido para operaciones. */
export type StoreBrandSlug = 'fersot' | 'sf';

export class CreateStoreOrderDto {
  items: OrderItemDto[];
  note?: string;
  paymentMethod?: string;
  customer?: StoreCustomerDto;
  storeBrand?: StoreBrandSlug;
}
