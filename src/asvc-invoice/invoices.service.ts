import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateSalesInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly supabase: SupabaseService) {}

  private readonly table = 'sales_invoices';

  async get_by_page( 
    page = 1, 
    limit = 100, 
    search?: string, 
  ) {
    limit = Math.min(limit, 500);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.client
      .from(this.table)
      .select(`
          *,
          customer:customers!sales_invoices_cid_fkey!inner (
            id,
            name,
            address
          ),
          user:users!sales_invoices_sales_agent_fkey!inner (
            id,
            name,
            role
          )`,
        { count: 'exact' }
      )
      .order("id", {ascending: false});

    if (search)
      query = query.or(`item_name.ilike.%${search}%,item_code.ilike.%${search}%`);
    
    const { data, error, count } = await query.range( from, to );

    if (error) throw new InternalServerErrorException(error.message);

    return {
      data,
      meta: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), },
    };
  }

  async find(id: number) {
    const { data, error } = await this.supabase.client
      .from(this.table)
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
      .from(this.table)
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
