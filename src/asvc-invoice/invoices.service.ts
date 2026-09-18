import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateSalesInvoiceDto } from './dto/update-invoice.dto';
import { CreateSalesReturnDto } from './dto/invoice-item-return.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly supabase: SupabaseService) {}

  private readonly table = 'sales_invoices';

  async return(dto: CreateSalesReturnDto) {
    if (!dto.items || dto.items.length === 0) 
      throw new BadRequestException('Return items are required');

    const { data, error } = await this.supabase.client.rpc('create_sales_return', {
      p_invoice_id: dto.invoice_id,
      p_reason: dto.reason ?? null,
      p_items: dto.items,
    });

    if (error) 
      throw new BadRequestException(error.message || 'Failed to create sales return');
    return data;
  }

  async get_by_page( page = 1, limit = 100, search?: string,) {
    limit = Math.min(limit, 500);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    let query = this.supabase.client
      .from(this.table)
      .select(`
          *,
          customer:customers!sales_invoices_cid_fkey!inner ( id, name, address ),
          user:users!sales_invoices_sales_agent_fkey!inner ( id, name, role )
        `, { count: 'exact' })
      .order("id", { ascending: false });
  
    if (search && search.trim()) {
      const sanitized = search.replace(/'/g, "''");
      const isNumeric = !isNaN(Number(search));
      if (isNumeric) {
        query = query.or( `order_id.eq.${Number(search)}` );
      } else {
        query = query.ilike('customer.name', `%${sanitized}%`);
      }
    }
  
    const { data, error, count } = await query.range(from, to);
    if (error) throw new InternalServerErrorException(error.message);
  
    return {
      data,
      meta: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), },
    };
  }

  // Sales Invoice History tab on a product's details page — every invoice
  // line that ever shipped this item, distinct from Sales Order History
  // (which lists the orders themselves, including ones not yet invoiced).
  async get_item_invoice_history(itemId: number) {
    try {
      const { data, error } = await this.supabase.client
        .from('sales_invoice_items')
        .select(`
          id,
          quantity,
          price,
          return_qty,
          sales_invoices!inner (
            id,
            invoice_number,
            invoice_date,
            order_id,
            customers!inner ( name )
          )
        `)
        .eq('item_id', itemId);

      if (error) throw error;

      return (data ?? [])
        .map((row) => {
          const invoice = row.sales_invoices as any;
          return {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            invoice_date: invoice.invoice_date,
            order_id: invoice.order_id,
            customer_name: invoice.customers?.name,
            quantity: row.quantity,
            return_qty: row.return_qty ?? 0,
            price: row.price,
          };
        })
        .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());
    } catch (err) {
      console.error('Failed to fetch item invoice history:', err);
      throw new InternalServerErrorException('Cannot fetch item invoice history');
    }
  }

  async get_latest_invoices() {
    try {
      const { data, error } = await this.supabase.client
        .from('sales_invoices')
        .select(`
          *,
          customers!inner(name)  
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Failed to fetch latest invoices:', err);
      throw new InternalServerErrorException('Cannot fetch latest invoices');
    }
  }

  async search(query: string, limit = 20) {
    const q = query?.trim();
  
    if (!q) {
      return [];
    }
  
    const { data, error } = await this.supabase.client
      .from(this.table)
      .select(`
          *,
          customer:customers!inner (
            name
          )
      `)
      .ilike('customers.name', `%${q}%`)
      .order('id', { ascending: false })
      .limit(limit);
    
    if (error) throw new NotFoundException('Cannot find ' + q);
    return data;
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
          id,
          quantity,
          price,
          products (
            id,
            item_code,
            item_name,
            unit
          ),
          return_qty
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
      order_id: data.order_id,
      invoice_date: data.invoice_date,
      total_price: data.total_price,
      items: data.sales_invoice_items,
      invoice_number: data.invoice_number,
      waybill_number: data.waybill_number,
      courier: data.courier,
      shipping_date: data.shipping_date,
    };
  }

  async getReturnAll(
    page = 1,
    limit = 100,
    search?: string,
  ) {
    limit = Math.min(limit, 500);
  
    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    let query = this.supabase.client
      .from('sales_returns')
      .select(`*,
        sales_invoices!inner (
          id,
          order_id,
          users!inner(
            id,
            username,
            name
          ),
          waybill_number,
          courier,
          invoice_date,
          invoice_number,
          customers!inner ( id, name )
        ),
        sales_return_items (
          id,
          return_id,
          invoice_item_id,
          return_qty,
          remaining_qty,
          products ( id, item_code, item_name, unit )
        ) 
      `, { count: "exact" })
      .order("id", { ascending: false });
  
    if (search?.trim()) {
      query = query.ilike("sales_invoices.customers.name", `%${search}%`);
    }
  
    const { data, error, count } = await query.range(from, to);
  
    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  
    return {
      data,
      meta: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
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
