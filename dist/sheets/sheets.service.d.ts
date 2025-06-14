import { OnModuleInit } from '@nestjs/common';
export declare class SheetsService implements OnModuleInit {
    private sheetsClient;
    onModuleInit(): Promise<void>;
    getData(spreadsheetId: string, range: string): Promise<any[]>;
    appendData(spreadsheetId: string, range: string, values: any[][]): Promise<void>;
    searchInventory(spreadsheetId: string, range: string): Promise<any[]>;
}
