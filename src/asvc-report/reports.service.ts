import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ReportsService {
  constructor(private readonly supabase: SupabaseService) {}

  async salesDashboard(from: string, to: string, slowDays?: number) {
    const { data, error } = await this.supabase.client.rpc(
      'report_sales_dashboard',
      { p_from: from, p_to: to, p_slow_days: slowDays ?? 90 },
    );
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async purchaseDashboard(from: string, to: string, status?: string) {
    const { data, error } = await this.supabase.client.rpc(
      'report_purchase_dashboard',
      { p_from: from, p_to: to, p_status: status ?? null },
    );
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }
}
