import { SheetsService } from '../sheets/sheets.service';
export declare class InventoryService {
    private readonly sheetsService;
    constructor(sheetsService: SheetsService);
    private spreadsheetId;
    private itemSheet;
    private itemRange;
    private supplierSheet;
    private supplierRange;
    private purchaseLogSheet;
    private purchaseRange;
    processPurchase(dto: {
        supplierInvoiceID: string;
        purchaseDate: string;
        itemCode: string;
        quantity: number;
        unit: string;
        unitCost: number;
        discount: number;
        grossPrice: number;
        supplierCode: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    findRowsAsObjectsByColumnHeader(spreadsheetId: string, sheetName: string, columnHeader: string, value: string | number): Promise<Record<string, string>[]>;
    getSheetDataAsObjects(spreadsheetId: string, sheetName: string, range: string): Promise<Record<string, string>[]>;
    adjustStock(spreadsheetId: string, itemName: string, PIC: string, stock: number, remarks: string): Promise<{
        message: string;
        itemCode: any;
        itemName: string;
        fromQuantity: number;
        toQuantity: number;
        adjustedQuantity: number;
        PIC: string;
        remarks: string;
    }>;
    updateItemPrice(spreadsheetId: string, itemName: string, price: number): Promise<{
        message: string;
        itemName: string;
        newPrice: number;
    }>;
    updateInventoryItem(spreadsheetId: string, itemName: string, updates: {
        brand?: string;
        minStock?: string | number;
        partNum?: string;
        interNum?: string;
        unit?: string;
        model?: string;
        category?: string;
    }): Promise<{
        message: string;
        updatedFields: string[];
    }>;
}
