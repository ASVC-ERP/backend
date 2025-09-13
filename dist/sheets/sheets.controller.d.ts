import { SheetsService } from './sheets.service';
export declare class SheetsController {
    private readonly sheetsService;
    constructor(sheetsService: SheetsService);
    getData(spreadsheetId: string, range: string): Promise<any[]>;
    addData(body: any): Promise<{
        message: string;
    }>;
}
