export type Product = {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: string;
};

export type Category = {
  id: number;
  name: string;
  products: Product[];
};

export type MenuResponse = {
  categories: Category[];
};

export type ExtraOptionDto = {
  id: number;
  name: string;
  price: string;
  active: boolean;
};

export type ProductExtraGroupDto = {
  id: number;
  productId: number;
  groupId: number;
  maxSelections: number | null;
  group: {
    id: number;
    name: string;
    minSelections: number;
    maxSelections: number | null;
    options: ExtraOptionDto[];
  };
  customOptions: Array<{
    optionId: number;
    priceOverride: string | null;
    option: ExtraOptionDto;
  }>;
};

export type TimelineStep = {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
};

export type LineItemSummary = {
  quantity: number;
  productName: string;
  extras: { name: string; quantity: number }[];
};

export type OrderStatusResponse = {
  id: number;
  status: string;
  kitchenStatus: string;
  totalAmount: string;
  paymentLabel?: string;
  kitchenLabel?: string;
  timeline?: TimelineStep[];
  lineItems?: LineItemSummary[];
  createdAt: string;
  updatedAt: string;
};
