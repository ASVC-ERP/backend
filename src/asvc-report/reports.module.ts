import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiModule } from '../asvc-ai/ai.module';

@Module({
  imports: [SupabaseModule, AiModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
