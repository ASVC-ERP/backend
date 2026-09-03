// General Module for the NestJS application
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { SupabaseModule } from './supabase/supabase.module';
import { CustomerModule } from './asvc-customer/asvc-customer.module';0
import { UsersModule } from './asvc-user/asvc-user.module';
import { SupplierModule } from './asvc-supplier/asvc-supplier.module';
import { OrderModule } from './asvc-order/asvc-order.module';
import { ProductModule } from './asvc-product/product.module';
import { InvoicesModule } from './asvc-invoice/invoices.module';
import { AuthenticationModule } from './asvc-auth/asvc-auth.module';
import { SupplierInvoiceModule } from './asvc-supplier-invoice/supplier-invoice.module';
import { PrintModule } from './asvc-print/asvc-print.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),  // contains react build
      //exclude: ['/api*'], // 👈 don’t override backend API routes
    }),
    // Default rate limit: 5 requests / 60s per IP. Only routes that use
    // ThrottlerGuard are actually limited (currently just POST /authenticate/login).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
    SupabaseModule,
    CustomerModule,
    UsersModule,
    SupplierModule,
    OrderModule,
    ProductModule,
    InvoicesModule,
    AuthenticationModule,
    SupplierInvoiceModule,
    PrintModule,
    HealthModule,
  ]
})
export class AppModule {}
