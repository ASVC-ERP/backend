import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ValidationPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { OrderService } from './asvc-order.service';
import { CreateSalesOrderDto } from './dto/create-order.dto';
import { UpdateSalesOrderDto } from './dto/update-order.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly service: OrderService) {}

  // ====================================================================================================================================
  // POST
  // ====================================================================================================================================
  @Post()
  create(@Body(new ValidationPipe()) dto: CreateSalesOrderDto) {
    return this.service.create(dto);
  }

  @Post('id/:id/serve')
  serve(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { items: { order_item_id: number; serve_qty: number }[] },
  ) {
    return this.service.serve(id, body.items);
  }

  @Post('id/:id/request')
  request_serve(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { items: { order_item_id: number; serve_qty: number }[] },
  ) {
    return this.service.request_serve(id, body.items);
  }

  @Post('id/:id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.approve(id);
  }

  @Post('id/:id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.reject(id);
  }

  @Post('id/:id/unserve')
  unserve(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.unserve(id);
  }

  @Post('id/:id/invoice')
  async invoice(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.invoice(id);
  }

  // ====================================================================================================================================
  // GET
  // ====================================================================================================================================
  @Get()
  async get_by_page(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: string
  ) {
    return this.service.get_by_page( page, limit, search, status );
  }

  @Get('latest')
  async get_latest_orders() {
    return this.service.get_latest_orders();
  }

  @Get('count')
  async count() {
    return this.service.count();
  }

  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    console.log("Search Query: ", q);
    return this.service.search(q, limit);
  }

  @Get('id/:id')
  find(@Param('id') id: number) {
    return this.service.find(id);
  }

  @Get(':id/order-items')
  get_items(@Param('id') id: number) {
    return this.service.get_order_items_for_edit(id);
  }

  @Get(':id/serve-history')
  getServedOrdersByItem(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getServedOrdersByItem(id)
  }

  // ====================================================================================================================================
  // PUT
  // ====================================================================================================================================
  @Put('id/:id')
  update(@Param('id') id: number, @Body() dto: UpdateSalesOrderDto) {
    return this.service.update(id, dto);
  }

  // ====================================================================================================================================
  // PATCH
  // ====================================================================================================================================

  // ====================================================================================================================================
  // DELETE
  // ====================================================================================================================================
  @Delete('id/:id')
  async delete(@Param('id') id: number) {
    await this.service.delete(id);
    return { message: 'Order' + id + ' deleted successfully' };
  }
}
