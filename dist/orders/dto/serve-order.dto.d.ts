declare class ServeItemDto {
    itemName: string;
    price: number;
    quantityOrdered: number;
    quantityServed: number;
    quantityUnserved: number;
}
export declare class ServeOrderDto {
    date: string;
    customerName: string;
    customerAddress: string;
    customerNumber: string;
    salesAgent: string;
    items: ServeItemDto[];
}
export {};
