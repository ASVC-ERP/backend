import { SheetsService } from '../../sheets/sheets.service';
import { ItemsService } from '../../items/items.service';
import { CreateInvoiceDto } from './dto/suppliers-invoice.dto';
export declare class SuppliersInvoiceService {
    private readonly sheetsService;
    private readonly itemsService;
    private spreadsheetId;
    private sheetName;
    private range;
    constructor(sheetsService: SheetsService, itemsService: ItemsService);
    private generateInvoiceNumber;
    addInvoice(dto: CreateInvoiceDto): Promise<{
        message: string;
        invoiceID: string;
    }>;
    findAll(): Promise<{
        invoiceID: any;
        poNum: any;
        purchaseDate: any;
        itemName: any;
        itemCode: any;
        quantity: number;
        unit: any;
        unitCost: number;
        currency: any;
        conversionFactor: number;
        subTotal: number;
        status: any;
        supplierID: any;
    }[]>;
    findBySupplier(supplierID?: string): Promise<any[]>;
    findByItem(itemCode: string): Promise<{
        invoiceID: any;
        poNum: any;
        purchaseDate: any;
        itemName: any;
        itemCode: any;
        quantity: number;
        unit: any;
        unitCost: number;
        currency: any;
        conversionFactor: number;
        subTotal: number;
        status: any;
        supplierID: any;
    }[]>;
}
