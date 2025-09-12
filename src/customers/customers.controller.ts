import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { CustomersService, Customer } from './customers.service';
import { AddCustomerDto } from './dto/add-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

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

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto
  ): Promise<Customer> {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.customersService.delete(id);
    return { message: `Customer ${id} deleted successfully` };
  }

}
