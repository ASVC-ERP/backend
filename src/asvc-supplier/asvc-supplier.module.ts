import { Module } from '@nestjs/common';
import { SupplierService } from './asvc-supplier.service';
import { SupplierController } from './asvc-supplier.controller'
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [SupplierService],
  controllers: [SupplierController]
})
export class SupplierModule {}
