import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { AdjustPriceDto } from './dto/adjust-price.dto';

@Controller('product')
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Get()
  async find_all() {
    return this.service.find_all();
  }

  @Get('details')
  get_details(@Query('item_name') item_name: string) {
    return this.service.get_details(item_name);
  }

  @Get('page/')
  async find_by_page(
    @Query('page') page = '1',
    @Query('limit') limit = '1000',
  ) {
    return this.service.find_by_page(
      Number(page),
      Number(limit),
    );
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.service.find(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.service.update(+id, dto);
  }

  @Patch(':id/stock')
  adjust_stock(
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.service.adjust_stock(+id, dto);
  }

  @Patch(':id/price')
  adjust_price(
    @Param('id') id: string,
    @Body() dto: AdjustPriceDto,
  ) {
    return this.service.adjust_price(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
