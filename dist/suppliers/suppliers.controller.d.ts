import { SheetsService } from '../sheets/sheets.service';
export declare class SuppliersController {
    private readonly sheetsService;
    constructor(sheetsService: SheetsService);
    private spreadsheetId;
    private sheetName;
    private range;
    getSuppliers(): Promise<{
        name: any;
        address: any;
    }[]>;
    addSupplier(body: {
        name: string;
        address: string;
    }): Promise<{
        message: string;
    }>;
}
