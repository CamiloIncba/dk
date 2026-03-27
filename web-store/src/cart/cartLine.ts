export type CartExtra = {
  optionId: number;
  name: string;
  unitPrice: number;
  qty: number;
};

export type CartLine = {
  key: string;
  productId: number;
  productName: string;
  baseUnitPrice: number;
  quantity: number;
  extras: CartExtra[];
};

export function makeLineKey(
  productId: number,
  extras: { optionId: number; qty: number }[],
): string {
  const sorted = [...extras].sort((a, b) => a.optionId - b.optionId);
  return `${productId}|${sorted.map((e) => `${e.optionId}x${e.qty}`).join(",")}`;
}

export function lineUnitTotal(line: CartLine): number {
  const extraSum = line.extras.reduce(
    (s, e) => s + e.unitPrice * e.qty,
    0,
  );
  return line.baseUnitPrice + extraSum;
}

export function lineTotal(line: CartLine): number {
  return lineUnitTotal(line) * line.quantity;
}
