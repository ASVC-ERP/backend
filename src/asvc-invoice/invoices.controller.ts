import { Controller, Post, Param, Get, Delete, Patch, ParseIntPipe } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Controller('process')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Post('order/:id/invoice')
  generate(
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.generate(id);
  }
}
