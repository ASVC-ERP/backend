import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSalesOrderDto } from './dto/create-order.dto';
import { UpdateSalesOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(private readonly supabase: SupabaseService) {}

// ------------------------------------------------------------------------------------------------------------------------------------
// CRUD Functions
// API: localhost:3000/api/order
// ------------------------------------------------------------------------------------------------------------------------------------

  async create(dto: CreateSalesOrderDto) {

    // 1. validate item codes
    const item = dto.items.map(i => i.item_code);

    const { data: existingItems, error: itemError } =
      await this.supabase.client
        .from('products')
        .select('item_code')
        .in('item_code', item);

    if (itemError) throw itemError;

    // 1.1 find missing items
    const existingCodes = new Set(
      existingItems.map(i => i.item_code)
    );

    const missing = item.filter(
      code => !existingCodes.has(code)
    );

    if (missing.length > 0) {
      throw new BadRequestException(
        `Item(s) not found: ${missing.join(', ')}`
      );
    }

    // 1.2 compute subtotal
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    const discount = dto.discount ?? 0;
    const total_price = subtotal - discount;
    
    const { data: user, error: userError } = await this.supabase.client
      .from('users')
      .select('role')
      .eq('username', dto.sales_agent)
      .single();

    if (userError) throw userError;

    const approval_status = user.role === 'admin' ? 'Not Required' : 'Required';

    // 2. create sales order
    const { data: order, error } = await this.supabase.client
      .from('sales_orders')
      .insert({
        cid: dto.cid,
        sales_agent: dto.sales_agent,
        order_date: new Date(),
        discount,
        total_price,
        status: 'Open',
        approval_status: approval_status
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
    const { data, error } = await this.supabase.client
      .from('sales_orders')
      .select(`
        id,
        order_code,
        order_date,
        status,
        total_price,
        discount,
        users (
          id,
          username,
          role
        ),
        approval_status,
        created_at,
        customers (
          cid,
          name,
          address,
          number
        ),
        sales_order_items (
          id,
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
      order_code: data.order_code,
      order_date: data.order_date,
      status: data.status,
      total_price: data.total_price,
      discount: data.discount,
      approval_status: data.approval_status,
      created_at: data.created_at,
      sales_agent: data.users,
      customer: data.customers,
      items: data.sales_order_items
    };
  }

  async find_serve_items(id: number) {
    const { data, error } = await this.supabase.client
      .from('serve_items')
      .select('*')
      .eq('order_id', id)
  
    if (error) throw error;

    return data;
  }

  async find_order_items(id: number) {
    console.log(id);
    const { data, error } = await this.supabase.client
      .from('sales_order_items')
      .select('*')
      .eq('sales_order_id', id)
  
    if (error) throw error;

    return data;
  }

  async update(id: number, dto: UpdateSalesOrderDto) {
    // 1. Ensure order exists
    const { data: order, error: findError } = await this.supabase.client
      .from('sales_orders')
      .select('id')
      .eq('id', id)
      .single();
  
    if (findError || !order) {
      throw new Error('Sales order not found');
    }
  
    // 2. Recompute totals from items
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
  
    const discount = dto.discount ?? 0;
    const total_price = subtotal - discount;
  
    // 3. Update order header
    const { error: updateError } = await this.supabase.client
      .from('sales_orders')
      .update({
        cid: dto.cid,
        sales_agent: dto.sales_agent,
        order_date: dto.order_date,
        discount,
        total_price
      })
      .eq('id', id);
  
    if (updateError) throw updateError;
  
    // 4. Delete existing items
    const { error: deleteError } = await this.supabase.client
      .from('sales_order_items')
      .delete()
      .eq('sales_order_id', id);
  
    if (deleteError) throw deleteError;
  
    // 5. Insert new items
    const itemsPayload = dto.items.map(item => ({
      sales_order_id: id,
      item_code: item.item_code,
      quantity: item.quantity,
      price: item.price
    }));
  
    const { error: insertError } = await this.supabase.client
      .from('sales_order_items')
      .insert(itemsPayload);
  
    if (insertError) throw insertError;
  
    return { updated: true };
  }
  
  async delete(id: number) {
    // 1. Check order exists
    const { data: order, error: orderError } = await this.supabase.client
      .from('sales_orders')
      .select('id')
      .eq('id', id)
      .single();
  
    if (orderError || !order) {
      throw new NotFoundException('Order' + id + ' not found');
    }
  
    // 2. Delete items FIRST (FK safety)
    const { error: itemsError } = await this.supabase.client
      .from('sales_order_items')
      .delete()
      .eq('sales_order_id', id);
  
    if (itemsError) {
      throw new BadRequestException(itemsError.message);
    }
  
    // 3. Delete order
    const { error: orderDeleteError } = await this.supabase.client
      .from('sales_orders')
      .delete()
      .eq('id', id);
  
    if (orderDeleteError) {
      throw new BadRequestException(orderDeleteError.message);
    }
  }





// ------------------------------------------------------------------------------------------------------------------------------------
// Serve Functions
// API: localhost:3000/api/order/:id/serve
// Payload:
/*
  {
    "items": [
      {"item_code": "CJ-GMBG5213XR", "quantity_to_serve": 1},
      {"item_code": "CJ-GMBG5281XR", "quantity_to_serve": 1}
    ]
  }
*/
// ------------------------------------------------------------------------------------------------------------------------------------
  async serve(id: number, items_to_serve: any[]) {
    console.log(id);
    const { data, error } = await this.supabase.client.rpc(
      'serve_sales_order',
      {
        p_order_id: id,
        p_items: items_to_serve,
      },
    );

    if (error) throw error;

    return data;
  }


// ------------------------------------------------------------------------------------------------------------------------------------
// Request Functions
// API: localhost:3000/api/order/:id/request
// ------------------------------------------------------------------------------------------------------------------------------------
 async request(
    id: number,
    items: { item_code: string; quantity_to_serve: number }[],
  ) {
    const { data, error } = await this.supabase.client.rpc(
      'request_serve_sales_order',
      {
        p_order_id: id,
        p_items: items,
      },
    );
  
    if (error) throw error;
  
    return {
      message: 'Serve request submitted for approval',
      data,
    };
  }

// ------------------------------------------------------------------------------------------------------------------------------------
// Approve Functions
// API: localhost:3000/api/order/:id/approve
// ------------------------------------------------------------------------------------------------------------------------------------
  async approve(id: number) {
    const { data, error } = await this.supabase.client.rpc(
      'approve_serve_sales_order',
      { p_order_id: id },
    );

    if (error) throw error;

    return {
      message: 'Serve request approved',
      ...data,
    };
  }

// ------------------------------------------------------------------------------------------------------------------------------------
// Reject Functions
// API: localhost:3000/api/order/:id/reject
// ------------------------------------------------------------------------------------------------------------------------------------
  async reject(id: number) {
    const { data, error } = await this.supabase.client.rpc(
      'reject_serve_sales_order',
      { p_order_id: id },
    );

    if (error) throw error;

    return {
      message: 'Serve request rejected',
      ...data,
    };
  }



// ------------------------------------------------------------------------------------------------------------------------------------
// Invoice Functions
// API: localhost:3000/api/order/:id/invoice
// ------------------------------------------------------------------------------------------------------------------------------------
  async invoice(id: number) {
    const { data, error } = await this.supabase.client.rpc(
      'create_sales_invoice',
      { p_order_id: id },
    );

    if (error) throw error;

    return data;
  }
}