import { SheetsService } from '../sheets/sheets.service';
export interface InvoiceItem {
    itemName: string;
    quantity: number;
    price: number;
    totalPrice: number;
}
export declare class Invoice {
    invoiceID: string;
    date: string;
    customerName: string;
    customerAddress?: string;
    customerNumber?: string;
    status: string;
    salesAgent?: string;
    items: InvoiceItem[];
}
export declare class InvoiceService {
    private readonly sheetsService;
    private spreadsheetId;
    private sheetName;
    private range;
    constructor(sheetsService: SheetsService);
    findAll(): Promise<Invoice[]>;
    search(query: string): Promise<Invoice[]>;
    createInvoiceFromOrder(order: any): Promise<Invoice[]>;
    findOne(invoiceID: string): Promise<Invoice>;
}
