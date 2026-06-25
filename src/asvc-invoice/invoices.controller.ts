import { Controller, Post, Get, Delete, Patch,  Body, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { UpdateSalesInvoiceDto } from './dto/update-invoice.dto';
import { CreateSalesReturnDto } from './dto/invoice-item-return.dto';

@Controller('invoice')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Post()
  return(@Body() dto: CreateSalesReturnDto) {
    return this.service.return(dto);
  }

  @Get()
  async get_by_page(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.service.get_by_page( page, limit, search );
  }

  @Get('latest')
  async get_latest_invoices() {
    return this.service.get_latest_invoices();
  }

  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    console.log("Search Query: ", q);
    return this.service.search(q, limit);
  }

  @Get('return')
  async getReturnAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.service.getReturnAll( page, limit, search );
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
