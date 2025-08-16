import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { InvoiceService, Invoice } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  async findAll(): Promise<Invoice[]> {
    return this.invoiceService.findAll();
  }

  @Get('search')
  async search(@Query('query') query: string): Promise<Invoice[]> {
    return this.invoiceService.search(query);
  }
}
