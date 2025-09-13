export declare class CreateInvoiceItemDto {
    itemName: string;
    itemCode: string;
    quantity: number;
    unit: string;
    unitCost: number;
    currency?: string;
    conversionFactor: number;
    subTotal: number;
}
export declare class CreateInvoiceDto {
    poNum: string;
    purchaseDate: Date;
    items: CreateInvoiceItemDto[];
    status?: 'Purchased' | 'Returned';
    supplierID?: string;
}
