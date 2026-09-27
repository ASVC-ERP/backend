import { Module } from '@nestjs/common';
import { PrintService } from './asvc-print.service';
import { PrintController } from './asvc-print.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [PrintService],
  controllers: [PrintController]
})
export class PrintModule {}
