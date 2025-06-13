import { CreateItemDto } from './dto/create-item.dto';
import { SheetsService } from '../sheets/sheets.service';
export type Items = CreateItemDto & {
    id: number;
};
export declare class ItemsService {
    private readonly sheetsService;
    private spreadsheetId;
    private sheetName;
    private range;
    constructor(sheetsService: SheetsService);
    create(item: CreateItemDto): Promise<Items>;
    findAll(): Promise<{
        id: number;
        itemCode: any;
        itemName: any;
        brand: any;
        origin: any;
        stock: number;
        price1: number;
        price2: number;
        price3: number;
        price4: number;
    }[]>;
}
