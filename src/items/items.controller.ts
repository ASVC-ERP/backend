import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  create(@Body() dto: CreateItemDto) {
    console.log("📥 Received item from frontend:", dto);
    return this.itemsService.create(dto);
  }

  @Get()
  async findAll(@Query('search') search?: string) {
    return this.itemsService.findAll(search);
  }
}
