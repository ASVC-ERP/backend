export class CreateOrderDto {
  orderId: string;
  date: string;
  customerName: string;
  customerAddress: string;
  customerNumber: string;
  status: string;
  orderedItems: any[]; // could define a specific type
  totalPrice: number;
  salesAgent: string;
}
