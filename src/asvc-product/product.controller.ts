import { 
  Controller,
  DefaultValuePipe, 
  ParseIntPipe,  
  Body,  
  Get, 
  Post,
  Put,
  Patch,
  Param,
  Delete,
  Query,
  Req
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { AdjustPriceDto } from './dto/adjust-price.dto';
import { AdjustCostDto } from './dto/adjust-cost.dto';

@Controller('product')
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Get()
  async find_by_page(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('stock') stockStatus?: string
  ) {

    let normalizedStock: 'in' | 'out' | undefined;
    if (stockStatus === 'in' || stockStatus === 'out') { normalizedStock = stockStatus;} 
    else { normalizedStock = undefined; /* handles "", undefined, invalid */ }

    return this.service.find_by_page(
      page,
      limit,
      search?.trim() || undefined,
      normalizedStock,
    );
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
    return this.service.search(q, limit);
  }

  @Get("check-code/:itemCode")
  async checkItemCode(@Param("itemCode") itemCode: string) {
    return this.service.checkItemCode(itemCode);
  }

  @Get(':id/stock-adjustments')
  async listAdjustments(@Param('id') id: number) {
    return this.service.listAdjustments(id);
  }

  @Get('id/:id')
  find(@Param('id') id: string) {
    return this.service.find(+id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.service.update(+id, dto);
  }

  @Patch(':id/stock')
  adjust_stock(
    @Param('id') id: number,
    @Body() dto: AdjustStockDto,
  ) {
    return this.service.adjust_stock(id, dto);
  }

  @Patch(':id/price')
  adjust_price(
    @Param('id') id: string,
    @Body() dto: AdjustPriceDto,
  ) {
    return this.service.adjust_price(+id, dto);
  }

  @Patch(':id/cost')
  adjust_cost(
    @Param('id') id: string,
    @Body() dto: AdjustCostDto,
    @Req() req,
  ) {
    return this.service.adjust_cost(+id, dto, req.user?.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
