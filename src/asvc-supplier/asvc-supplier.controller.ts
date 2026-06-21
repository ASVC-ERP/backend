import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { SupplierService } from './asvc-supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('supplier')
export class SupplierController {
  constructor(private readonly service: SupplierService) {}

  @Post()
  create(@Body(new ValidationPipe({ whitelist: true })) dto: CreateSupplierDto) {
    return this.service.create(dto);
  }

  @Get()
  async find_by_page(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.service.find_by_page(
      page,
      limit,
      search?.trim() || undefined,
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
    console.log("Search Query: ", q);
    return this.service.search(q, limit);
  }

  @Get(':id')
  read_one(@Param('id') id: string) {
    return this.service.read_one(id);
  }

  @Get('check-sid/:sid')
  async checkSid(@Param('sid') sid: string) {
    return this.service.checkSid(sid);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) dto: UpdateSupplierDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
