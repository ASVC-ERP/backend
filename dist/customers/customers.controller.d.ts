import { CustomersService, Customer } from './customers.service';
import { AddCustomerDto } from './dto/add-customer.dto';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(dto: AddCustomerDto): Promise<Customer>;
    findAll(): Promise<Customer[]>;
    search(query: string): Promise<Customer[]>;
}
