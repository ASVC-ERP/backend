import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { CreateSupplierInvoiceDto } from './dto/create-invoice.dto';
import { UpdateSupplierInvoiceDto } from './dto/update-invoice.dto';
import { ReturnDto } from './dto/return-item.dto';
import { ReturnSupplierInvoiceDto } from './dto/create-return.dto';

@Controller('supplier-invoice')
export class SupplierInvoiceController {
  constructor( private readonly service: SupplierInvoiceService ) {}

  @Post()
  create(@Body() dto: CreateSupplierInvoiceDto) {
    console.log(dto);
    return this.service.create(dto);
  }

  @Post(':id/return')
  returnItems( @Param('id') id: string, @Body() dto: ReturnSupplierInvoiceDto,) { 
    return this.service.returnItems(Number(id), dto); 
  }

  @Patch(':id/post')
  post_invoice(@Param('id', ParseIntPipe) id: number) {
    return this.service.post_invoice(id);
  }

  @Get()
  async find_by_page(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('supplier') supplier: number,
    @Query('name') name: string
  ) {
    return this.service.find_by_page(
      page,
      limit,
      supplier,
      name
    );
  }

  @Get('id/:id')
  find_by_id(
    @Param('id') id: number
  ) {
    return this.service.find_by_id(id);
  }

  @Get('costs/:productId')
  getCosts(@Param('productId', ParseIntPipe) productId: number) {
    return this.service.get_costs(productId);
  }

  @Get('return')
  getallReturns(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('name') name: string
  ) {
    return this.service.get_all_returns(page, limit, name);
  }

  @Put('v1/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierInvoiceDto,
  ) {
    return this.service.update(id, dto);
  }

  @Put('v2/:id')
  update2(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierInvoiceDto,
  ) {
    return this.service.update2(id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.remove(id);
  }
}
