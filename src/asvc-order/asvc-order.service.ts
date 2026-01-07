import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSalesOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateSalesOrderDto) {
    // 1. compute subtotal
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    const discount = dto.discount ?? 0;
    const total_price = subtotal - discount;

    // 2. create sales order
    const { data: order, error } = await this.supabase.client
      .from('sales_orders')
      .insert({
        cid: dto.cid,
        sales_agent: dto.sales_agent,
        order_date: dto.order_date,
        discount,
        total_price,
        status: 'OPEN'
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Get latest order_code
    const { data: lastOrder, error: lastError } =
      await this.supabase.client
        .from('sales_orders')
        .select('order_code')
        .not('order_code', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (lastError && lastError.code !== 'PGRST116') {
      throw lastError;
    }

    // 4. Generate next order_code
    let nextNumber = 1;

    if (lastOrder?.order_code) {
      const match = lastOrder.order_code.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    const order_code = `ORD${nextNumber.toString().padStart(4, '0')}`;

    // 5. Update order with order_code
    const { error: updateError } = await this.supabase.client
      .from('sales_orders')
      .update({ order_code })
      .eq('id', order.id);

    if (updateError) throw updateError;

    // 6. insert order items
    const items = dto.items.map(item => ({
      sales_order_id: order.id,
      item_code: item.item_code,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await this.supabase.client
      .from('sales_order_items')
      .insert(items);

    if (itemsError) throw itemsError;

    return {
      id: order.id,
      order_code
    };
  }

  async findAll() {
    const { data, error } = await this.supabase.client
      .from('sales_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async find(id: number) {
    const { data: order, error } = await this.supabase.client
      .from('sales_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    const { data: items } = await this.supabase.client
      .from('sales_order_items')
      .select('*')
      .eq('sales_order_id', id);

    return { ...order, items };
  }

}
