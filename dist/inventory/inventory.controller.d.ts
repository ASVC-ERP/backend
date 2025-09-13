import { InventoryService } from './inventory.service';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    addInventory(body: any): Promise<{
        success: boolean;
        message: string;
    }>;
    findByHeaderObjects(itemName: string): Promise<Record<string, string>[]>;
    getPhysicalCount(itemName: string): Promise<Record<string, string>[]>;
    getSalesOrderHistory(itemName: string): Promise<Record<string, string>[]>;
    adjustStock(itemName: string, PIC: string, stock: string, remarks: string): Promise<{
        message: string;
        itemCode: any;
        itemName: string;
        fromQuantity: number;
        toQuantity: number;
        adjustedQuantity: number;
        PIC: string;
        remarks: string;
    }>;
    updatePrice(itemName: string, price: string): Promise<{
        message: string;
        itemName: string;
        newPrice: number;
    }>;
    updateInventory(body: any): Promise<{
        message: string;
        updatedFields: string[];
    }>;
}
