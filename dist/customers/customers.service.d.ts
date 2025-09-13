import { AddCustomerDto } from './dto/add-customer.dto';
import { SheetsService } from '../sheets/sheets.service';
export type Customer = {
    customerID: string;
    customerName: string;
    customerContact: string;
    customerAddress: string;
};
export declare class CustomersService {
    private readonly sheetsService;
    private spreadsheetId;
    private sheetName;
    private range;
    constructor(sheetsService: SheetsService);
    create(customer: AddCustomerDto): Promise<Customer>;
    findAll(): Promise<Customer[]>;
    search(query: string): Promise<Customer[]>;
}
