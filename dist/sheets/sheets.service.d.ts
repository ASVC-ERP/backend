import { OnModuleInit } from '@nestjs/common';
export declare class SheetsService implements OnModuleInit {
    private sheetsClient;
    onModuleInit(): Promise<void>;
    getData(spreadsheetId: string, range: string): Promise<any[]>;
    clearRow(spreadsheetId: string, sheetName: string, row: number): Promise<void>;
    appendData(spreadsheetId: string, range: string, values: any[][]): Promise<void>;
    clear(spreadsheetId: string, range: string): Promise<void>;
    updateData(spreadsheetId: string, range: string, values: any[][]): Promise<void>;
    updateRow(spreadsheetId: string, sheetName: string, rowNumber: number, values: any[]): Promise<void>;
    updateCell(spreadsheetId: string, sheetName: string, cell: string, newValue: any): Promise<void>;
    searchInventory(spreadsheetId: string, range: string): Promise<any[]>;
}
