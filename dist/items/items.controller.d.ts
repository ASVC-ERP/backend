import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
export declare class ItemsController {
    private readonly itemsService;
    constructor(itemsService: ItemsService);
    create(dto: CreateItemDto): Promise<CreateItemDto>;
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
}
