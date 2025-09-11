import { Controller, Get, Post, Put, Body, Query, Param } from '@nestjs/common';
import { InvoiceService, Invoice } from './invoice.service';
import { OrdersService } from '../orders/orders.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Controller('invoice')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly ordersService: OrdersService,
  ) {}

  @Put(':id/status')
  async updateStatus(
    @Param('id') invoiceID: string,
    @Body('status') status: string,
  ) {
    await this.invoiceService.updateStatus(invoiceID, status);
    return { success: true, invoiceID, status };
  }

  @Post(':orderId/invoice')
  async invoiceOrder(@Param('orderId') orderId: string) {
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
}
