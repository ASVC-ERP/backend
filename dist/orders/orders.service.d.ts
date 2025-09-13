import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ServeOrderDto } from './dto/serve-order.dto';
import { SheetsService } from '../sheets/sheets.service';
export type Order = CreateOrderDto;
export declare class OrdersService {
    private readonly sheetsService;
    private spreadsheetId;
    private sheetName;
    private range;
    constructor(sheetsService: SheetsService);
    create(order: CreateOrderDto): Promise<Order>;
    findAll(): Promise<Order[]>;
    findOne(orderId: string): Promise<CreateOrderDto>;
    update(orderId: string, dto: UpdateOrderDto): Promise<{
        message: string;
        updatedItems: number;
    }>;
    private readonly salesOrderHistorySheet;
    private readonly salesInvoiceSheet;
    serveOrder(orderId: string, serveData: ServeOrderDto): Promise<{
        message: string;
        rowsLogged: {
            history: number;
            invoice: number;
        };
        invoiceId: string;
    }>;
}
