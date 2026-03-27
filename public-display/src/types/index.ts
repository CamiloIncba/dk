export interface Order {
  id: number;
  kitchenStatus: string;
  receiptCode: string | null;
  createdAt: string;
}

export interface DisplayResponse {
  inPreparation: Order[];
  ready: Order[];
  generatedAt: string;
}
