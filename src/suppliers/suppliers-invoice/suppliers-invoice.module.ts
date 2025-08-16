import { Module } from '@nestjs/common';
import { SuppliersInvoiceService } from './suppliers-invoice.service';
import { SuppliersInvoiceController } from './suppliers-invoice.controller';
import { SheetsModule } from '../../sheets/sheets.module';
import { ItemsModule } from '../../items/items.module'; 

@Module({
  imports: [SheetsModule, ItemsModule],
  providers: [SuppliersInvoiceService],
  controllers: [SuppliersInvoiceController]
})
export class SuppliersInvoiceModule {}
