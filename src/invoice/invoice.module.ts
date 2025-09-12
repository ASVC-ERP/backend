import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { OrdersModule } from '../orders/orders.module';
import { SheetsModule } from '../sheets/sheets.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [SheetsModule, OrdersModule],
  controllers: [InvoiceController],
  providers: [InvoiceService],
})
export class InvoiceModule {}
