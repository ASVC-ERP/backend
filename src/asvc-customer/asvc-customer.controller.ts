import { Controller, Get, Post, Body, Param, Put, Delete, ValidationPipe } from '@nestjs/common';
import { CustomerService } from './asvc-customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  async create(@Body(new ValidationPipe()) dto: CreateCustomerDto) {
    return this.customerService.create(dto);
  }

  @Get()
  async read() {
    return this.customerService.read();
  }

  @Get(':id')
  async read_one(@Param('id') id: number) {
    return this.customerService.read_one(Number(id));
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body(new ValidationPipe()) dto: UpdateCustomerDto,
  ) {
    return this.customerService.update(Number(id), dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.customerService.delete(Number(id));
  }
}
