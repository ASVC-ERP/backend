// General Module for the NestJS application
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SheetsModule } from './sheets/sheets.module';
import { OrdersModule } from './orders/orders.module';
import { ItemsModule } from './items/items.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { SuppliersInvoiceModule } from './suppliers/suppliers-invoice/suppliers-invoice.module';
import { CustomersModule } from './customers/customers.module';
import { InvoiceModule } from './invoice/invoice.module';
import { DeliveryReceiptsModule } from './delivery-receipts/delivery-receipts.module';

@Module({
  imports: [
    SheetsModule,
    OrdersModule, 
    ItemsModule,
    SuppliersModule,
    AuthModule,
    InventoryModule,
    SuppliersInvoiceModule,
    CustomersModule,
    InvoiceModule,
    DeliveryReceiptsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
