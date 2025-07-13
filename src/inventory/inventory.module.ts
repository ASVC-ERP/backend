import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { SheetsModule } from '../sheets/sheets.module';

@Module({
  imports: [SheetsModule],
  providers: [InventoryService],
  controllers: [InventoryController]
})
export class InventoryModule {}
