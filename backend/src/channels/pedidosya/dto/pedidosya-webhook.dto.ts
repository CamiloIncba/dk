/**
 * DTO for PedidosYa webhook events.
 * Reference: https://developers-portal.pedidosya.com/
 *
 * PedidosYa sends a POST to the configured webhook URL with event data.
 * The exact payload varies by event type; these types cover the order lifecycle.
 */

export class PedidosYaOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  optionGroups?: PedidosYaOptionGroup[];
}

export class PedidosYaOptionGroup {
  name: string;
  options: PedidosYaOption[];
}

export class PedidosYaOption {
  name: string;
  price: number;
  quantity: number;
}

export class PedidosYaAddress {
  street: string;
  corner?: string;
  city: string;
  area?: string;
  zipCode?: string;
  coordinates?: { lat: number; lng: number };
  description?: string;
}

export class PedidosYaWebhookDto {
  event: string; // 'ORDER_NEW' | 'ORDER_STATE_CHANGE' | 'ORDER_CANCEL'
  id: string;
  registeredDate?: string;
  state?: string;
  restaurant?: { id: string; name: string };
  details?: PedidosYaOrderItem[];
  address?: PedidosYaAddress;
  customer?: { name: string; phone?: string };
  totalAmount?: number;
  deliveryAmount?: number;
  discountAmount?: number;
  payment?: { method: string; online: boolean };
  /** Raw payload for auditing. */
  [key: string]: unknown;
}
