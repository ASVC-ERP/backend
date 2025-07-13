import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { SuppliersInvoiceService } from './suppliers-invoice.service';
import { CreateInvoiceDto } from './dto/suppliers-invoice.dto';

@Controller('invoices')
export class SuppliersInvoiceController {
  constructor(private readonly invoiceService: SuppliersInvoiceService) {}

  @Post()
  addInvoice(@Body() dto: CreateInvoiceDto) {
    console.log("📥 Received invoice payload:", JSON.stringify(dto, null, 2));
    return this.invoiceService.addInvoice(dto);
  }

  @Get()
  getInvoices() {
    return this.invoiceService.findAll();
  }

  @Get(':supplierID')
  getInvoicesBySupplier(@Param('supplierID') supplierID: string) {
    console.log("Supplier ID:", supplierID);
    return this.invoiceService.findBySupplier(supplierID);
  }
}   
