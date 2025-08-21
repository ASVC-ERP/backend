export class CreateInvoiceItemDto {
  itemName: string;
  itemCode: string;
  quantity: number;
  unit: string;
  unitCost: number;
  discount?: number;
  grossPrice: number;
  currency?: string;
  conversionFactor?: number;
  convertedGrossPrice: number;
}

export class CreateInvoiceDto {
  poNumber?: string;
  purchaseDate: string;
  items: CreateInvoiceItemDto[];
  status?: 'purchase' | 'return';
  supplierID?: string;
}
