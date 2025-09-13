export declare enum OrderStatus {
    Pending = "Pending",
    Confirmed = "Confirmed",
    Shipped = "Shipped",
    Delivered = "Delivered",
    Canceled = "Canceled"
}
declare class OrderedItemDto {
    itemName: string;
    quantity: number;
    price: number;
}
export declare class CreateOrderDto {
    orderId: string;
    date: string;
    customerName: string;
    customerAddress: string;
    customerNumber: string;
    orderedItems: OrderedItemDto[];
    totalPrice: number;
    salesAgent: string;
    status: OrderStatus;
}
export {};
