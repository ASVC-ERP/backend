import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { SheetsModule } from '../sheets/sheets.module';
import { ItemsService } from '../items/items.service';

@Module({
  imports: [SheetsModule],
  providers: [InventoryService, ItemsService],
  controllers: [InventoryController]
})
export class InventoryModule {}
