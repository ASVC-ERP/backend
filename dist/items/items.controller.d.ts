import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
export declare class ItemsController {
    private readonly itemsService;
    constructor(itemsService: ItemsService);
    create(dto: CreateItemDto): import("./items.service").Items;
    findAll(): import("./items.service").Items[];
    getOneTask(id: string): import("./items.service").Items | undefined;
}
