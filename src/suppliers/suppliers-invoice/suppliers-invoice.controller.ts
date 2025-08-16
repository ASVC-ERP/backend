import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SuppliersInvoiceService } from './suppliers-invoice.service';
import { CreateInvoiceDto } from './dto/suppliers-invoice.dto';

@Controller('suppliers/supplier-invoices')
export class SuppliersInvoiceController {
  constructor(private readonly invoiceService: SuppliersInvoiceService) {}

  @Post()
  async addInvoice(@Body() dto: CreateInvoiceDto) {
    return this.invoiceService.addInvoice(dto);
  }

  @Get()
  async getAllInvoices() {
    return this.invoiceService.findAll();
  }

  @Get(':supplierID')
  async getInvoicesBySupplier(@Param('supplierID') supplierID: string) {
    return this.invoiceService.findBySupplier(supplierID);
  }

  @Get('items/:itemCode')
  async getInvoicesByItem(@Param('itemCode') itemCode: string) {
    return this.invoiceService.findByItem(itemCode);
  }
}
