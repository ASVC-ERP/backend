import { Controller, Get, Post, Body, Param, Put, Delete, Query, ValidationPipe, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { CustomerService } from './asvc-customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customer')
export class CustomerController {
  constructor(private readonly service: CustomerService) {}

  @Post()
  async create(@Body(new ValidationPipe()) dto: CreateCustomerDto) {
    return this.service.create(dto);
  }

  @Get()
  async read() {
    return this.service.read();
  }

  @Get('count')
  async count() {
    return this.service.count();
  }  

  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    console.log("Search Query: ", q);
    return this.service.search(q, limit);
  }

/*
  @Get()
  async get_by_page(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('filter') filter?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir: 'asc' | 'desc' = 'desc',
  ) {
    return this.service.read_all( page, limit, filter, sortBy, sortDir );
  }
*/

  @Get(':id')
  async read_one(@Param('id') id: number) {
    return this.service.read_one(Number(id));
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body(new ValidationPipe()) dto: UpdateCustomerDto,
  ) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.service.delete(Number(id));
  }
}
