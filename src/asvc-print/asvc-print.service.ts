import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PrintService {
  constructor(private readonly service: SupabaseService) {}

  private get client() {
    return this.service.client;
  }

// ------------------------------------------------------------------------------------------------------------------------------------
// Sales-Order Print Functions
// API: /api/print/sales-order/:id
// ------------------------------------------------------------------------------------------------------------------------------------
  async read_so(id: number) {
    console.log(id);
    const { data, error } = await this.client
      .from('sales_orders')
      .select(`
        id,
        order_code,
        order_date,
        status,
        approval_status,
        customers (
          cid,
          name,
          address,
          tin
        ),
        sales_order_items (
          quantity,
          price,
          products (
            item_code,
            item_name,
            unit
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Sales order not found');
    }

    return {
      orderId: data.order_code ?? '',
      date: data.order_date,
      customerName: data.customers?.name ?? '',
      customerAddress: data.customers?.address ?? '',
      customerTIN: data.customers?.tin ?? '',
      orderedItems: data.sales_order_items.map(item => ({
        itemName: item.products?.item_name ?? '',
        quantity: item.quantity,
        unit: item.products?.unit ?? '',
        price: item.price,
      })),
    };
  }

// ------------------------------------------------------------------------------------------------------------------------------------
// Packing List Functions
// API: /api/print/packing-list/:id
// ------------------------------------------------------------------------------------------------------------------------------------  
  async read_pl(orderId: number) {
    const { data, error } = await this.client
      .from('sales_orders')
      .select(`
        order_date,
        status,
        customers (
          name,
          address,
          tin
        ),
        sales_order_items (
          quantity,
          products (
            item_name,
            unit
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Sales order not found');
    }

    return {
      date: data.order_date,
      customerName: data.customers?.name ?? '',
      customerAddress: data.customers?.address ?? '',
      customerTIN: data.customers?.tin ?? '',
      items: data.sales_order_items.map(item => ({
        itemName: item.products?.item_name ?? '',
        quantity: item.quantity,
        unit: item.products?.unit ?? '',
        carton: '',
      })),
    };
  }
}