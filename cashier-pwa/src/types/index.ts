// Tipos para la API del cajero

// Extras en órdenes
export interface OrderItemExtra {
  id: number;
  extraOptionId: number;
  quantity: number;
  unitPrice: string;
  extraOption: {
    id: number;
    name: string;
    price: number;
  };
}

export interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: string;
  product: {
    id: number;
    name: string;
    price: string;
  };
  extras?: OrderItemExtra[];
}

export interface Order {
  id: number;
  status: string;
  kitchenStatus: string;
  receiptCode: string | null;
  totalAmount: string;
  createdAt: string;
  channel?: string;
  note?: string;
  items?: OrderItem[];  // opcional porque /admin/orders/recent no incluye items
}

export interface DisplayOrder {
  id: number;
  receiptCode: string | null;
  kitchenStatus: string;
  createdAt: string;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  active: boolean;
  categoryId: number;
}

export interface Category {
  id: number;
  name: string;
  position: number;
  active: boolean;
  products: MenuItem[];
}

export interface MenuResponse {
  categories: Category[];
}

export interface DisplayResponse {
  inPreparation: DisplayOrder[];
  ready: DisplayOrder[];
  generatedAt: string;
}

// Tipos para carrito con extras
export interface CartItemExtra {
  optionId: number;
  name: string;
  price: number; // precio final (puede ser override o default)
  quantity: number;
}

export interface CartItem {
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  extras: CartItemExtra[];
  // ID único para diferenciar items del mismo producto con distintos extras
  cartKey: string;
}
