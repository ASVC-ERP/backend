import { Injectable, BadRequestException, NotFoundException} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateSalesInvoiceDto } from './dto/update-invoice.dto';

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
        shipping_date,
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
      shipping_date: data.shipping_date,
    };
  }

  // sales-invoices.service.ts
  async update(
    id: number,
    dto: UpdateSalesInvoiceDto,
  ) {
    const { data, error } = await this.supabase.client
      .from('sales_invoices')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // handles unique invoice_number violation too
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Sales invoice not found');
    }

    return data;
  }

}
