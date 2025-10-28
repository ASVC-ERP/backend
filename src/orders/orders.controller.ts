import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ServeOrderDto } from './dto/serve-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    console.log('📥 Received order from frontend:', dto);
    return this.ordersService.create(dto);
  }

  @Get()
  findAll(
    @Query('agent') agent?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAll(agent, status);
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    console.log(`✏️ Updating order ${id}`, dto);
    return this.ordersService.update(id, dto);
  }

  @Patch(':orderID/serve')
  async serveOrder(
    @Param('orderID') orderId: string,
    @Body() serveData: ServeOrderDto,
    @Query('role') role: string,
  ) {
    return this.ordersService.serveOrder(orderId, serveData, role);
  }

  @Post('serve-approved')
  async serveApprovedOrders(@Body() { orderIds }: { orderIds: string[] }) {
    return this.ordersService.serveApprovedOrders(orderIds);
  }

  @Post('reject')
  async rejectOrders(@Body() { orderIds }: { orderIds: string[] }) {
    return this.ordersService.rejectOrders(orderIds);
  }

  @Get('sales-orders/by-status')
  async getSalesOrdersByStatus(@Query('status') status: string) {
    return this.ordersService.getSalesOrdersByStatus(status);
  }
}
