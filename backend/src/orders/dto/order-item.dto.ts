export class OrderItemExtraDto {
  optionId: number;
  quantity?: number; // default 1
}

export class OrderItemDto {
  productId: number;
  quantity: number;
  extras?: OrderItemExtraDto[]; // Extras seleccionados para este item
}
