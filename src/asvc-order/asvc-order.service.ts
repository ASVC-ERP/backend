import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSalesOrderDto } from './dto/create-order.dto';
import { UpdateSalesOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(private readonly supabase: SupabaseService) {}

// ------------------------------------------------------------------------------------------------------------------------------------
// CRUD Functions
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
        order_date: dto.order_date,
        discount,
        total_price,
        status: 'Open',
        approval_status
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
// ------------------------------------------------------------------------------------------------------------------------------------

  async serve(
    id: number,
    itemsToServe: { item_code: string; quantity_to_serve: number } []
  ) {
    // 0. fetch the sales order
    const { data: orderData, error: orderError } = await this.supabase.client
      .from('sales_orders')
      .select('id, status, approval_status')
      .eq('id', id)
      .single();
    if (orderError) throw orderError;

    // 0.1 check approval status
    if (orderData.approval_status !== 'Not Required') {
      throw new Error(
        `Order ${id} requires approval.`,
      );
    }

    // 0.2 check status
    if (orderData.status !== 'Open') {
      throw new Error(
        `Order ${id} is closed. Cannot proceed to serve.`,
      );
    }

    // 1. fetch order items
    const { data: orderItems, error: itemsError } = await this.supabase.client
      .from('sales_order_items')
      .select('*')
      .eq('sales_order_id', id);
    if (itemsError) throw itemsError;

    // 2. fetch stock for all items
    const itemCodes = itemsToServe.map((i) => i.item_code);
    const { data: stockData, error: stockError } = await this.supabase.client
      .from('products')
      .select('item_code, stock')
      .in('item_code', itemCodes);
    if (stockError) throw stockError;

    // 3. validate requested quantities
    for (const item of itemsToServe) {
      const stock =
        stockData.find((s) => s.item_code === item.item_code)?.stock || 0;
      const orderedQty =
        orderItems.find((o) => o.item_code === item.item_code)?.quantity || 0;

      if (item.quantity_to_serve > stock) {
        throw new Error(
          `Cannot serve ${item.quantity_to_serve} of ${item.item_code}. Only ${stock} in stock.`,
        );
      }

      if (item.quantity_to_serve > orderedQty) {
        throw new Error(
          `Cannot serve ${item.quantity_to_serve} of ${item.item_code}. Only ${orderedQty} ordered.`,
        );
      }
    }

    // 4. insert or update serve_items
    const serveItems = itemsToServe.map((item) => ({
      order_id: id,
      item_code: item.item_code,
      quantity_ordered:
        orderItems.find((o) => o.item_code === item.item_code)!.quantity,
      quantity_to_serve: item.quantity_to_serve,
      status: item.quantity_to_serve > 0 ? 'served' : 'cannot_serve',
    }));

    const { error: upsertError } = await this.supabase.client
      .from('serve_items')
      .upsert(serveItems, { onConflict: 'id' });
    if (upsertError) throw upsertError;

    // 5. subtract stock
    for (const item of serveItems) {
      if (item.quantity_to_serve > 0) {
        const currentStock =
          stockData.find((s) => s.item_code === item.item_code)!.stock;
        const { error: updateError } = await this.supabase.client
          .from('products')
          .update({ stock: currentStock - item.quantity_to_serve })
          .eq('item_code', item.item_code);
        if (updateError) throw updateError;
      }
    }

    // 6. update sales_orders.status if all items served
    const servedCount = serveItems.filter((i) => i.status === 'served').length;

    let newStatus = orderData.status; // default to current status
    if (servedCount === serveItems.length) {
      newStatus = 'Served';
    } else if (servedCount > 0) {
      newStatus = 'Partial Served';
    } else {
      newStatus = 'Cannot Serve';
    }

    const { error: orderUpdateError } = await this.supabase.client
      .from('sales_orders')
      .update({ status: newStatus })
      .eq('id', id);

    if (orderUpdateError) throw orderUpdateError;

    return serveItems;
  }

  async request(
    id: number,
    items: { item_code: string; quantity_to_serve: number }[],
  ) {
    // 1. fetch order
    const { data: order, error: orderError } = await this.supabase.client
      .from('sales_orders')
      .select('id, status, approval_status')
      .eq('id', id)
      .single();

    if (orderError) throw orderError;

    // 0.2 check status
    if (order.status !== 'Open') {
      throw new Error(
        `Order ${id} is closed. Cannot proceed to serve.`,
      );
    }

    // 2. fetch order items
    const { data: orderItems, error: itemsError } =
      await this.supabase.client
        .from('sales_order_items')
        .select('*')
        .eq('sales_order_id', id);

    if (itemsError) throw itemsError;

    // 3. validate quantities vs ordered
    for (const item of items) {
      const orderedQty =
        orderItems.find(o => o.item_code === item.item_code)?.quantity ?? 0;

      if (item.quantity_to_serve <= 0) {
        throw new Error(`Quantity must be greater than 0`);
      }

      if (item.quantity_to_serve > orderedQty) {
        throw new Error(
          `Cannot request ${item.quantity_to_serve} of ${item.item_code}. Only ${orderedQty} ordered.`,
        );
      }
    }

    // 4. insert serve_items as PENDING
    const serveItems = items.map(item => ({
      order_id: id,
      item_code: item.item_code,
      quantity_ordered:
        orderItems.find(o => o.item_code === item.item_code)!.quantity,
      quantity_to_serve: item.quantity_to_serve,
      status: 'pending',
    }));

    const { error: insertError } = await this.supabase.client
      .from('serve_items')
      .insert(serveItems);

    if (insertError) throw insertError;

    return {
      message: 'Serve request submitted for approval',
      items: serveItems,
    };
  }

  async approve(id: number) {
    // 1. fetch pending serve requests
    const { data: serveItems, error: serveError } =
      await this.supabase.client
        .from('serve_items')
        .select('*')
        .eq('order_id', id)
        .eq('status', 'pending');
  
    if (serveError) throw serveError;
    if (!serveItems || serveItems.length === 0) {
      throw new Error('No pending serve requests');
    }
  
    // 2. fetch stock
    const itemCodes = serveItems.map(i => i.item_code);
  
    const { data: stockData, error: stockError } =
      await this.supabase.client
        .from('products')
        .select('item_code, stock')
        .in('item_code', itemCodes);
  
    if (stockError) throw stockError;
  
    // 3. validate stock
    for (const item of serveItems) {
      const stock =
        stockData.find(s => s.item_code === item.item_code)?.stock ?? 0;
  
      if (item.quantity_to_serve > stock) {
        throw new Error(
          `Insufficient stock for ${item.item_code}. Available: ${stock}`,
        );
      }
    }
  
    // 4. subtract stock + approve serve_items (PER ITEM)
    for (const item of serveItems) {
      const currentStock =
        stockData.find(s => s.item_code === item.item_code)!.stock;
  
      // subtract stock
      const { error: stockUpdateError } = await this.supabase.client
        .from('products')
        .update({ stock: currentStock - item.quantity_to_serve })
        .eq('item_code', item.item_code);
  
      if (stockUpdateError) throw stockUpdateError;
  
      // approve serve item
      const { error: serveUpdateError } = await this.supabase.client
        .from('serve_items')
        .update({
          quantity_to_serve: item.quantity_to_serve,
          status: 'served',
          updated_at: new Date(),
        })
        .eq('id', item.id);
  
      if (serveUpdateError) throw serveUpdateError;
    }
  
    // 5. update order status
    const { data: allServeItems, error: allServeItemsError } =
      await this.supabase.client
        .from('serve_items')
        .select('*')
        .eq('order_id', id);
  
    if (allServeItemsError) throw allServeItemsError;
  
    const fullyServed = allServeItems.every(
      i => i.quantity_to_serve === i.quantity_ordered,
    );
  
    const newStatus = fullyServed ? 'Served' : 'Partial Served';
  
    const { error: orderUpdateError } = await this.supabase.client
      .from('sales_orders')
      .update({ status: newStatus })
      .eq('id', id);
  
    if (orderUpdateError) throw orderUpdateError;
  
    return { message: 'Serve request approved', status: newStatus };
  }

  async reject(id: number) {
    // 1. verify pending serve requests exist
    const { data: pendingItems, error: pendingError } =
      await this.supabase.client
        .from('serve_items')
        .select('id')
        .eq('order_id', id)
        .eq('status', 'pending');

    if (pendingError) throw pendingError;

    if (!pendingItems || pendingItems.length === 0) {
      throw new Error('No pending serve requests to reject');
    }

    // 2. delete pending serve_items
    const { error: deleteError } = await this.supabase.client
      .from('serve_items')
      .delete()
      .eq('order_id', id)
      .eq('status', 'pending');

    if (deleteError) throw deleteError;

    // 3. update order status
    const { error: orderUpdateError } = await this.supabase.client
      .from('sales_orders')
      .update({ status: 'Open' })
      .eq('id', id);

    if (orderUpdateError) throw orderUpdateError;

    return {
      message: 'Serve request rejected and cleared',
      id,
      status: 'Open',
    };
  }

// ------------------------------------------------------------------------------------------------------------------------------------
// Invoice Functions
// ------------------------------------------------------------------------------------------------------------------------------------
  async invoice(id: number) {
    // 1. fetch order
    const { data: order, error: orderError } =
      await this.supabase.client
        .from('sales_orders')
        .select('*')
        .eq('id', id)
        .single();

    if (orderError) throw orderError;

    if (!['Served', 'Partial Served'].includes(order.status)) {
      throw new Error(
        `Cannot create invoice. Order status is ${order.status}`,
      );
    }

    // 2. check existing invoice
    const { data: existingInvoice } =
      await this.supabase.client
        .from('sales_invoices')
        .select('id')
        .eq('sales_order_id', id)
        .maybeSingle();

    if (existingInvoice) {
      throw new Error('Invoice already exists for this order');
    }

    // 3. fetch served items
    const { data: serveItems, error: serveError } =
      await this.supabase.client
        .from('serve_items')
        .select('*')
        .eq('order_id', id)
        .gt('quantity_to_serve', 0);

    if (serveError) throw serveError;
    if (!serveItems.length) {
      throw new Error('No served items to invoice');
    }

    // 4. fetch prices
    const itemCodes = serveItems.map(i => i.item_code);

    const { data: orderItems, error: orderItemsError } =
      await this.supabase.client
        .from('sales_order_items')
        .select('item_code, price')
        .eq('sales_order_id', id)
        .in('item_code', itemCodes);

    if (orderItemsError) throw orderItemsError;

    const order_invoice = `INV-${order.order_code}`

    // 5. create invoice
    const { data: invoice, error: invoiceError } =
      await this.supabase.client
        .from('sales_invoices')
        .insert({
          sales_order_id: id,
          cid: order.cid,
          sales_agent: order.sales_agent,
          invoice_date: new Date(),
          order_invoice: order_invoice,
        })
        .select()
        .single();

    if (invoiceError) throw invoiceError;

    // 6. create invoice items
    const invoiceItems = serveItems.map(item => {
      const price =
        orderItems.find(o => o.item_code === item.item_code)?.price ?? 0;

      return {
        sales_invoice_id: invoice.id,
        item_code: item.item_code,
        quantity: item.quantity_to_serve,
        price,
      };
    });

    const { error: itemsError } =
      await this.supabase.client
        .from('sales_invoice_items')
        .insert(invoiceItems);

    if (itemsError) throw itemsError;

    // 7. compute total
    const totalPrice = invoiceItems.reduce(
      (sum, i) => sum + i.quantity * i.price,
      0,
    );

    // 8. update invoice total
    const { error: updateError } =
      await this.supabase.client
        .from('sales_invoices')
        .update({ total_price: totalPrice })
        .eq('id', invoice.id);

    if (updateError) throw updateError;

    return {
      invoice_id: invoice.id,
      total_price: totalPrice,
    };
  }
}