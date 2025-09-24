// General Module for the NestJS application
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
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
import { PackingListModule } from './packing-list/packing-list.module';

@Module({
  imports: [

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),  // contains react build
      //exclude: ['/api*'], // 👈 don’t override backend API routes
    }),

    ConfigModule.forRoot({
      isGlobal: true, // makes env variables available everywhere
    }),

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
    PackingListModule,
  ]
})
export class AppModule {}
