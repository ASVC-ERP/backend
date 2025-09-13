import { InvoiceService, Invoice } from './invoice.service';
import { OrdersService } from '../orders/orders.service';
export declare class InvoiceController {
    private readonly invoiceService;
    private readonly ordersService;
    constructor(invoiceService: InvoiceService, ordersService: OrdersService);
    invoiceOrder(orderId: string): Promise<Invoice[]>;
    findAll(): Promise<Invoice[]>;
    search(query: string): Promise<Invoice[]>;
}
