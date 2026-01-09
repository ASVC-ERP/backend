import { Module } from '@nestjs/common';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { SupplierInvoiceController } from './supplier-invoice.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [SupplierInvoiceService],
  controllers: [SupplierInvoiceController]
})
export class SupplierInvoiceModule {}
