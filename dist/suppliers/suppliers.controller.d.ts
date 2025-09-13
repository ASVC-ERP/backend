import { SheetsService } from '../sheets/sheets.service';
export declare class SuppliersController {
    private readonly sheetsService;
    constructor(sheetsService: SheetsService);
    private spreadsheetId;
    private sheetName;
    private range;
    getSuppliers(): Promise<{
        id: any;
        name: any;
        address: any;
    }[]>;
    addSupplier(body: {
        id: string;
        name: string;
        address: string;
    }): Promise<{
        message: string;
    }>;
    updateSupplier(supplierId: string, body: {
        newId?: string;
        name?: string;
        address?: string;
    }): Promise<{
        message: string;
    }>;
}
