import { CreateItemDto } from './dto/create-item.dto';
export type Items = CreateItemDto & {
    id: number;
};
export declare class ItemsService {
    private items;
    create(item: CreateItemDto): Items;
    findAll(): Items[];
    findOne(id: number): Items | undefined;
}
