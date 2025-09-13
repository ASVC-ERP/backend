import { CreateItemDto } from './dto/create-item.dto';
import { SheetsService } from '../sheets/sheets.service';
export type Items = CreateItemDto;
export declare class ItemsService {
    private readonly sheetsService;
    private spreadsheetId;
    private sheetName;
    private range;
    constructor(sheetsService: SheetsService);
    create(item: CreateItemDto): Promise<Items>;
    findAll(search?: string): Promise<{
        itemCode: any;
        itemName: any;
        brand: any;
        origin: any;
        stock: number;
        minStock: number;
        price: {
            price1: number;
            price2: number;
            price3: number;
            price4: number;
        };
    }[]>;
    addStock(itemCode: string, quantityToAdd: number, convertedGrossPrice: number): Promise<void>;
    removeStock(itemCode: string, quantityToRemove: number): Promise<void>;
}
