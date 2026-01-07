import { Module } from '@nestjs/common';
import { CustomerController } from './asvc-customer.controller';
import { CustomerService } from './asvc-customer.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [CustomerController],
  providers: [CustomerService]
})
export class CustomerModule {}
