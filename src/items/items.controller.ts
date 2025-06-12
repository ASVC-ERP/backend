import { Controller, Get, Post, Body, Param } from '@nestjs/common';
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

  //Get Specific Inventory via ID
  @Get(':id')
  getOneTask(@Param('id') id: string) {
    return this.itemsService.findOne(+id);  // `+id` converts string to number
  }
}
