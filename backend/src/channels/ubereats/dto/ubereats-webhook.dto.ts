/**
 * DTO for Uber Eats webhook events.
 * Reference: https://developer.uber.com/docs/eats/
 *
 * Uber Eats uses a notification → pull model: webhook notifies of new orders,
 * then the integration fetches full order details via the Orders API.
 */

export class UberEatsItem {
  id: string;
  title: string;
  quantity: number;
  price: { unitPrice: { amount: number }; totalPrice: { amount: number } };
  selectedModifierGroups?: UberEatsModifierGroup[];
}

export class UberEatsModifierGroup {
  title: string;
  selectedItems: UberEatsModifierItem[];
}

export class UberEatsModifierItem {
  title: string;
  quantity: number;
  price: { unitPrice: { amount: number } };
}

export class UberEatsWebhookDto {
  event_type: string; // 'orders.notification' | 'orders.cancel'
  event_id: string;
  event_time: string;
  meta?: { resource_id: string; status?: string };
  resource_href?: string;
  /** Full order payload (when fetched via pull). */
  order?: {
    id: string;
    displayId: string;
    store?: { id: string; name: string };
    items: UberEatsItem[];
    totalPrice: number;
    eater?: { firstName: string; phone?: string };
    deliveryInfo?: { address?: string; notes?: string };
  };
  [key: string]: unknown;
}
