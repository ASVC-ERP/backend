import { Module } from '@nestjs/common';
import { PrintService } from './asvc-print.service';
import { PrintController } from './asvc-print.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { DotMatrixInvoiceService } from './dot-matrix/dot-matrix-invoice.service';
import { PrinterTransportService } from './dot-matrix/printer-transport.service';

@Module({
  imports: [SupabaseModule],
  providers: [PrintService, DotMatrixInvoiceService, PrinterTransportService],
  controllers: [PrintController]
})
export class PrintModule {}
