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
  Req
} from '@nestjs/common';
import { OrderService } from './asvc-order.service';
import { CreateSalesOrderDto } from './dto/create-order.dto';
import { UpdateSalesOrderDto } from './dto/update-order.dto';
import { ServeOrderDto } from './dto/serve-order.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly service: OrderService) {}

  @Post()
  create(
    @Body(new ValidationPipe()) dto: CreateSalesOrderDto
  ) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  find(
    @Param('id') id: number
  ) {
    return this.service.find(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() dto: UpdateSalesOrderDto
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: number
  ) {
    await this.service.delete(id);
    return { message: 'Order' + id + ' deleted successfully' };
  }

}
