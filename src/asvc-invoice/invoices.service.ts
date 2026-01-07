import { Injectable, BadRequestException, } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class InvoicesService {
    constructor(private readonly supabase: SupabaseService) {}

  async generate(id: number) {
    const sb = this.supabase.client;

    /* 1️⃣ Fetch order */
    const { data: order, error: orderError } = await sb
      .from('sales_orders')
      .select('id, cid, order_code, total_price, sales_agent, approval_status')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      throw new BadRequestException('Sales order not found');
    }

    if (order.approval_status !== 'Approved') {
      throw new BadRequestException('Order is not approved');
    }

    /* 2️⃣ Fetch order items */
    const { data: orderItems, error: itemsError } = await sb
      .from('sales_order_items')
      .select('item_code, quantity, price')
      .eq('sales_order_id', id);

    if (itemsError || !orderItems?.length) {
      throw new BadRequestException('No order items found');
    }

    /* 3️⃣ Create invoice */
    const { data: invoice, error: invoiceError } = await sb
      .from('sales_invoices')
      .insert({
        sales_order_id: order.id,
        cid: order.cid,
        order_code: order.order_code,
        sales_agent: order.sales_agent,
        total_price: order.total_price,
        waybill_number: null,
        courier: null,
        invoice_date: null,
        invoice_number: null
      })
      .select()
      .single();

    if (invoiceError) {
      throw new BadRequestException('Failed to create invoice');
    }

    /* 4️⃣ Create invoice items */
    const invoiceItems = orderItems.map(item => ({
      sales_invoice_id: invoice.id,
      item_code: item.item_code,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: invoiceItemsError } = await sb
      .from('sales_invoice_items')
      .insert(invoiceItems);

    if (invoiceItemsError) {
      throw new BadRequestException('Failed to create invoice items');
    }

    /* 5️⃣ Update order status */
    const { error: statusError } = await sb
      .from('sales_orders')
      .update({ status: 'Invoiced' })
      .eq('id', id);

    if (statusError) {
      throw new BadRequestException('Failed to update order status');
    }

    return {
      message: 'Invoice generated successfully',
      invoice_id: invoice.id
    };
  }
}
