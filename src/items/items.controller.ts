import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }

  //Get All Inventory
  @Get()
  findAll() {
    return this.itemsService.findAll();
  }

  @Get('search')
  async search(@Query('query') query: string) {
    console.log('🔍 Received query:', query);
    try {
      return await this.itemsService.search(query);
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error; // or throw new InternalServerErrorException()
    }
  }
}
