import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
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


  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  find(
    @Param('id') id: number
  ) {
    return this.service.find(id);
  }

  @Patch(':id')
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
