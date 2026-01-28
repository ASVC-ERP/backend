import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { CreateSupplierInvoiceDto } from './dto/create-invoice.dto';
import { UpdateSupplierInvoiceDto } from './dto/update-invoice.dto';

@Controller('supplier-invoice')
export class SupplierInvoiceController {
  constructor( private readonly service: SupplierInvoiceService ) {}

  @Post()
  create(@Body() dto: CreateSupplierInvoiceDto) {
    return this.service.create(dto);
  }

  @Patch(':id/post')
  post_invoice(@Param('id', ParseIntPipe) id: number) {
    return this.service.post_invoice(id);
  }
/*
  @Get()
  findAll() {
    return this.service.findAll();
  }
*/
  @Get()
  async find_by_page(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('supplier') supplier: number
  ) {
    return this.service.find_by_page(
      page,
      limit,
      supplier
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

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierInvoiceDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.remove(id);
  }
}
