import { Injectable, BadRequestException, } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase.client
      .from('sales_invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async find(id: number) {
    const { data, error } = await this.supabase.client
      .from('sales_invoices')
      .select(`
        id,
        total_price,
        waybill_number,
        courier,
        invoice_date,
        invoice_number,
        created_at,
        sales_order_id,
        sales_invoice_items (
          sales_invoice_id,
          item_code,
          quantity,
          price
        )
      `)
      .eq('id', id)
      .single();
  
    if (error) throw error;
  
    return {
      id: data.id,
      created_at: data.created_at,
      sales_order_id: data.sales_order_id,
      items: data.sales_invoice_items,
      total_price: data.total_price,
      invoice_number: data.invoice_number,
      invoice_date: data.invoice_date,
      waybill_number: data.waybill_number,
      courier: data.courier,
    };
  }
}
