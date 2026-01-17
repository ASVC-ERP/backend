import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SalesOrderType } from './type/so.type';
import { PackingListType } from './type/pl.type';
import { DeliveryReceiptType } from './type/dr.type';
import { OrdersController } from 'src/orders/orders.controller';

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

    const so = data as SalesOrderType;

    return {
      orderId: so.order_code ?? '',
      date: so.order_date,
      customerName: so.customers?.name ?? '',
      customerAddress: so.customers?.address ?? '',
      customerTIN: so.customers?.tin ?? '',
      orderedItems: so.sales_order_items.map(item => ({
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
  async read_pl(id: number) {
    const { data, error } = await this.service.client
      .from('sales_invoices')
      .select(`
        id,
        invoice_date,
        customers (
          name,
          address,
          tin
        ),
        sales_invoice_items (
          quantity,
          products (
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

    const pl = data as PackingListType;
    const udata = data as any;

    return {
      date: pl.invoice_date,
      customerName: udata.customers?.name ?? '',
      customerAddress: udata.customers?.address ?? '',
      customerTIN: udata.customers?.tin ?? '',
      items: pl.sales_invoice_items.map(item => ({
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
          order_code
        ),
        customers (
          name,
          address,
          tin
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

    const row = data as DeliveryReceiptType;

    const urow = data as any;
    const order = urow.sales_orders;
    const customer = urow.customers;

    return {
      drNo: row.invoice_number ?? '',
      date: row.shipping_date ?? row.invoice_date,
      waybill: row.waybill_number ?? '',
      courier: row.courier ?? '',
      sales_order_id: order.id,
      sales_order_code: order.order_code,
      customerName: customer?.name ?? '',
      customerAddress: customer?.address ?? '',
      customerTIN: customer?.tin ?? '',
      items: row.sales_invoice_items.map(item => ({
        quantity: item.quantity,
        unit: item.products?.unit ?? '',
        itemName: item.products?.item_name ?? '',
        price: item.price,
      })),
    };
  }

}