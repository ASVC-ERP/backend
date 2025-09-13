import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ServeOrderDto } from './dto/serve-order.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    create(dto: CreateOrderDto): Promise<CreateOrderDto>;
    findAll(): Promise<CreateOrderDto[]>;
    findOne(id: string): Promise<CreateOrderDto>;
    update(id: string, dto: UpdateOrderDto): Promise<{
        message: string;
        updatedItems: number;
    }>;
    serveOrder(orderId: string, serveData: ServeOrderDto): Promise<{
        message: string;
        rowsLogged: {
            history: number;
            invoice: number;
        };
        invoiceId: string;
    }>;
}
