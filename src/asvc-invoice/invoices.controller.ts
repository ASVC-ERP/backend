import { Controller, Post, Get, Delete, Patch,  Body, Param, ParseIntPipe } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { UpdateSalesInvoiceDto } from './dto/update-invoice.dto';

@Controller('invoice')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

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
    @Body() dto: UpdateSalesInvoiceDto,
  ) {
    console.log("payload: ", dto);
    return this.service.update(id, dto);
  }
}
