import { SuppliersInvoiceService } from './suppliers-invoice.service';
import { CreateInvoiceDto } from './dto/suppliers-invoice.dto';
export declare class SuppliersInvoiceController {
    private readonly invoiceService;
    constructor(invoiceService: SuppliersInvoiceService);
    addInvoice(dto: CreateInvoiceDto): Promise<{
        message: string;
        invoiceID: string;
    }>;
    getAllInvoices(): Promise<{
        invoiceID: any;
        poNum: any;
        purchaseDate: any;
        itemName: any;
        itemCode: any;
        quantity: number;
        unit: any;
        unitCost: number;
        currency: any;
        conversionFactor: number;
        subTotal: number;
        status: any;
        supplierID: any;
    }[]>;
    getInvoicesBySupplier(supplierID: string): Promise<any[]>;
    getInvoicesByItem(itemCode: string): Promise<{
        invoiceID: any;
        poNum: any;
        purchaseDate: any;
        itemName: any;
        itemCode: any;
        quantity: number;
        unit: any;
        unitCost: number;
        currency: any;
        conversionFactor: number;
        subTotal: number;
        status: any;
        supplierID: any;
    }[]>;
}
