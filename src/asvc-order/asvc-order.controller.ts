import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { OrderService } from './asvc-order.service';
import { CreateSalesOrderDto } from './dto/create-order.dto';
import { UpdateSalesOrderDto } from './dto/update-order.dto';
import { ServeOrderDto } from './dto/serve-order.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly service: OrderService) {}

  @Post()
  create(@Body(new ValidationPipe()) dto: CreateSalesOrderDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  find(@Param('id') id: number) {
    return this.service.find(id);
  }

  @Get(':id/order-items')
  find_order_items(@Param('id') id: number) {
    return this.service.find_order_items(id);
  }

  @Get(':id/serve-items')
  find_serve_items(@Param('id') id: number) {
    return this.service.find_serve_items(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdateSalesOrderDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    await this.service.delete(id);
    return { message: 'Order' + id + ' deleted successfully' };
  }

  @Post(':id/serve')
  async serve(
    @Param('id')
    id: number,
    @Body()
    body: {
      items: {
        item_code: string;
        quantity_to_serve: number;
      }[];
    },
  ) {
    await this.service.serve(id, body.items);
  }

  @Post(':id/request')
  async requestServe(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: { items: { item_code: string; quantity_to_serve: number }[] },
  ) {
    return this.service.request(id, body.items);
  }

  @Post(':id/approve')
  async approve(@Param('id', ParseIntPipe) id: number) {
    return this.service.approve(id);
  }

  @Post(':id/reject')
  async reject(@Param('id', ParseIntPipe) id: number) {
    return this.service.reject(id);
  }

  @Post(':id/invoice')
  async invoice(@Param('id', ParseIntPipe) id: number) {
    return this.service.invoice(id);
  }
}
