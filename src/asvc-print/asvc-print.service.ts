import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PrintService {
  constructor(private readonly service: SupabaseService) {}

  // ------------------------------------------------------------------------------------------------------------------------------------
  // Sales-Order Get Function
  // ------------------------------------------------------------------------------------------------------------------------------------
  async read_so(id: number) {
    console.log(id);
    const { data, error } = await this.service.client
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

    const udata = data as any;

    return {
      orderId: data.order_code ?? '',
      date: data.order_date,
      customerName: udata.customers?.name ?? '',
      customerAddress: udata.customers?.address ?? '',
      customerTIN: udata.customers?.tin ?? '',
      orderedItems: udata.sales_order_items.map(item => ({
        itemName: item.products?.item_name ?? '',
        quantity: item.quantity,
        unit: item.products?.unit ?? '',
        price: item.price,
      })),
    };
  }

  // ------------------------------------------------------------------------------------------------------------------------------------
  // Packing List Get Function
  // ------------------------------------------------------------------------------------------------------------------------------------  
  async read_pl(orderId: number) {
    const { data, error } = await this.service.client
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

    const udata = data as any;

    return {
      date: data.order_date,
      customerName: udata.customers?.name ?? '',
      customerAddress: udata.customers?.address ?? '',
      customerTIN: udata.customers?.tin ?? '',
      items: udata.sales_order_items.map(item => ({
        itemName: item.products?.item_name ?? '',
        quantity: item.quantity,
        unit: item.products?.unit ?? '',
        carton: '',
      })),
    };
  }

  async read_dr(id: number) {
    const { data, error } = await this.service.client
      .from('sales_invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        waybill_number,
        shipping_date,
        courier,
        sales_orders (
          id,
          order_code,
          customers (
            name,
            address,
            tin
          )
        ),
        sales_invoice_items (
          quantity,
          price,
          products (
            item_name,
            unit
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const udata = data as any;

    return {
      drNo: data.invoice_number ?? "",
      date: data.shipping_date ?? data.invoice_date,
      waybill: data.waybill_number ?? "",
      courier: data.courier,
      customerName: udata.sales_orders.customers.name,
      customerAddress: udata.sales_orders.customers.address,
      customerTIN: udata.sales_orders.customers.tin,
      items: udata.sales_invoice_items.map(i => ({
        quantity: i.quantity,
        unit: i.products.unit,
        itemName: i.products.item_name,
        price: i.price,
      })),
    };
  }

}