import { Module } from '@nestjs/common';
import { OrderController } from './asvc-order.controller';
import { OrderService } from './asvc-order.service'
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [OrderController],
  providers: [OrderService]
})
export class OrderModule {}
