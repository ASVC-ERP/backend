import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { InvoiceService, Invoice } from './invoice.service';
import { OrdersService } from '../orders/orders.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Controller('invoice')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly ordersService: OrdersService,
  ) {}

  @Put(':id/waybill')
  async updateWayBill(
    @Param('id') invoiceID: string,
    @Body('waybillNumber') waybillNumber: string,
  ) {
    await this.invoiceService.updateWaybillNumber(invoiceID, waybillNumber);
    return { success: true, invoiceID, waybillNumber };
  }

  @Post(':id/invoice')
  async invoiceOrder(@Param('id') orderId: string) {
    const order = await this.ordersService.findOne(orderId);
    const invoice = await this.invoiceService.createInvoiceFromOrder(order);
    return invoice;
  }

  @Get()
  async findAll(): Promise<Invoice[]> {
    return this.invoiceService.findAll();
  }

  @Get('search')
  async search(@Query('query') query: string): Promise<Invoice[]> {
    return this.invoiceService.search(query);
  }

  @Delete(':id')
  async delete(@Param('id') invoiceID: string) {
    await this.invoiceService.deleteInvoice(invoiceID);
    return { success: true, invoiceID, message: 'Invoice deleted and stock updated' };
  }
}
