import { Controller, Post, Get, Delete, Patch,  Body, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { UpdateSalesInvoiceDto } from './dto/update-invoice.dto';

@Controller('invoice')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  async get_by_page(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.service.get_by_page( page, limit, search );
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
    @Body() dto: UpdateSalesInvoiceDto,
  ) {
    console.log("payload: ", dto);
    return this.service.update(id, dto);
  }
}
