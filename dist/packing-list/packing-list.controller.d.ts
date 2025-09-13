import type { Response } from 'express';
export declare class PackingListController {
    createInvoice(data: any, res: Response): Promise<void>;
    createInvoiceFinal(data: any, res: Response): Promise<void>;
}
