import { CreateOrderDto } from './dto/create-order.dto';
export type Order = CreateOrderDto & {
    id: number;
};
export declare class OrdersService {
    private orders;
    create(order: CreateOrderDto): Order;
    findAll(): Order[];
}
