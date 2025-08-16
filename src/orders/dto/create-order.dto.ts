export enum OrderStatus {
  Pending = "pending",
  Confirmed = "confirmed",
  Shipped = "shipped",
  Delivered = "delivered",
  Canceled = "canceled",
}

export class CreateOrderDto {
  orderId: string;
  date: string;
  customerName: string;
  customerAddress: string;
  customerNumber: string;
  orderedItems: any[];
  totalPrice: number;
  salesAgent: string;
  status: OrderStatus;
}
