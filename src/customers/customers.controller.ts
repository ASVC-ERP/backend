import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { CustomersService, Customer } from './customers.service';
import { AddCustomerDto } from './dto/add-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // POST /customers
  @Post()
  async create(@Body() dto: AddCustomerDto): Promise<Customer> {
    return this.customersService.create(dto);
  }

  // GET /customers
  @Get()
  async findAll(): Promise<Customer[]> {
    return this.customersService.findAll();
  }

  // GET /customers/search?query=John
  @Get('search')
  async search(@Query('query') query: string): Promise<Customer[]> {
    return this.customersService.search(query);
  }
}
