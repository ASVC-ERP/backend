import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ServeOrderDto } from './dto/serve-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    console.log("📥 Received order from frontend:", dto);
    return this.ordersService.create(dto);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
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

  @Patch(':orderId/serve')
  async serveOrder(@Param('orderId') orderId: string, @Body() serveData: ServeOrderDto) {
    return this.ordersService.serveOrder(orderId, serveData);
  }
}
