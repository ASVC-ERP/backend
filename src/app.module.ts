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
import { SupabaseModule } from './supabase/supabase.module';
import { CustomerModule } from './asvc-customer/asvc-customer.module';0
import { UsersModule } from './asvc-user/asvc-user.module';
import { SupplierModule } from './asvc-supplier/asvc-supplier.module';
import { OrderModule } from './asvc-order/asvc-order.module';
import { ProductModule } from './asvc-product/product.module';
import { InvoicesModule } from './asvc-invoice/invoices.module';
import { AuthenticationModule } from './asvc-auth/asvc-auth.module';
import { SupplierInvoiceModule } from './asvc-supplier-invoice/supplier-invoice.module';

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
    SupabaseModule,
    CustomerModule,
    UsersModule,
    SupplierModule,
    OrderModule,
    ProductModule,
    InvoicesModule,
    AuthenticationModule,
    SupplierInvoiceModule,
  ]
})
export class AppModule {}
