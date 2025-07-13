import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('add')
  async addInventory(@Body() body: any) {
    const result = await this.inventoryService.processPurchase(body);
    if (!result.success) {
      throw new BadRequestException(result.message);
    }
    return result;
  }
}
