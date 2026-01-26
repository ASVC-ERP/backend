import { Injectable, BadRequestException, NotFoundException} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateSalesInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase.client
      .from('sales_invoices')
      .select(`
        id,
        order_id,
        customers ( name, address ),
        users ( name ),
        waybill_number,
        courier,
        shipping_date,
        invoice_date
      `)
      .order('id', { ascending: false });

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
        order_id,
        sales_invoice_items (
          quantity,
          price,
          products (
            id,
            item_name,
            unit
          )
        ),
        customers (
          id,
          name,
          address,
          number,
          tin,
          terms
        )
      `)
      .eq('id', id)
      .single();
  
    if (error) throw error;
  
    return {
      id: data.id,
      customer: data.customers,
      invoice_date: data.invoice_date,
      total_price: data.total_price,
      items: data.sales_invoice_items,
      invoice_number: data.invoice_number,
      waybill_number: data.waybill_number,
      courier: data.courier,
      shipping_date: data.shipping_date,
    };
  }

  async update( id: number, dto: UpdateSalesInvoiceDto ) {
    const { data, error } = await this.supabase.client
      .from('sales_invoices')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw new BadRequestException(error.message);
    if (!data) 
      throw new NotFoundException('Sales invoice not found');
    return data;
  }
}
