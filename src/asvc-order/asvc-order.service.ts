import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSalesOrderDto } from './dto/create-order.dto';
import { UpdateSalesOrderDto } from './dto/update-order.dto';
import { ServeOrderDto } from './dto/serve-order.dto';

@Injectable()
export class OrderService {
  constructor(private readonly supabase: SupabaseService) {}

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
    const approval_status =
      dto.role === 'admin'
        ? 'not required'
        : 'pending';

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
        approval_status: '-'
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

  async request(id: number) {
    // 1. Ensure order exists
    const { data: order, error: findError } = await this.supabase.client
      .from('sales_orders')
      .select('id')
      .eq('id', id)
      .single();
  
    if (findError || !order) {
      throw new Error('Sales order not found');
    }

    //2. Approve order
    const { error: approveError } = await this.supabase.client
      .from('sales_orders')
      .update({
        status: "For Approval",
        approval_status: "For Request"
      })
      .eq('id', id);
  
    if (approveError) throw approveError;

    return { request: true };
  }

  /*
  async approve(id: number) {
    // 1. Ensure order exists
    const { data: order, error: findError } = await this.supabase.client
      .from('sales_orders')
      .select('id')
      .eq('id', id)
      .single();
  
    if (findError || !order) {
      throw new Error('Sales order not found');
    }

    //2. Approve order
    const { error: approveError } = await this.supabase.client
      .from('sales_orders')
      .update({
        status: "Ready to Invoice",
        approval_status: "Approved"
      })
      .eq('id', id);
  
    if (approveError) throw approveError;
    return { approved: true };
  }
  */

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
  
  async delete(orderId: number) {
    // 1. Check order exists
    const { data: order, error: orderError } = await this.supabase.client
      .from('sales_orders')
      .select('id')
      .eq('id', orderId)
      .single();
  
    if (orderError || !order) {
      throw new NotFoundException('Order' + orderId + ' not found');
    }
  
    // 2. Delete items FIRST (FK safety)
    const { error: itemsError } = await this.supabase.client
      .from('sales_order_items')
      .delete()
      .eq('sales_order_id', orderId);
  
    if (itemsError) {
      throw new BadRequestException(itemsError.message);
    }
  
    // 3. Delete order
    const { error: orderDeleteError } = await this.supabase.client
      .from('sales_orders')
      .delete()
      .eq('id', orderId);
  
    if (orderDeleteError) {
      throw new BadRequestException(orderDeleteError.message);
    }
  }

  async serve(orderId: number, dto: ServeOrderDto, user: any) {
    const sb = this.supabase.client;
  
    /* 1️. Fetch order */
    const { data: order, error: orderError } = await sb
      .from('sales_orders')
      .select('id, status, approval_status')
      .eq('id', orderId)
      .single();
  
    if (orderError || !order) {
      throw new BadRequestException('Order not found');
    }
  
    /*
    if (order.approval_status !== 'Approved') {
      throw new BadRequestException('Order is not approved');
    }
    */
    if (order.status === 'Served') {
      throw new BadRequestException('Order has already been served');
    }

    if (order.approval_status !== 'For Approval' && order.approval_status !== '-') {
      throw new BadRequestException('Order is not for approval');
    }
  
    /* 2️⃣ Fetch order items */
    const { data: orderItems, error: itemsError } = await sb
      .from('sales_order_items')
      .select('id, quantity')
      .eq('sales_order_id', orderId);
  
    if (itemsError || !orderItems) {
      throw new BadRequestException('Failed to fetch order items');
    }
  
    const itemMap = new Map(
      orderItems.map(i => [i.id, Number(i.quantity)])
    );
  
    /* 3️⃣ Validate served quantities */
    for (const item of dto.items) {
      const orderedQty = itemMap.get(item.sales_order_item_id);
  
      if (orderedQty === undefined) {
        throw new BadRequestException(
          `Invalid sales_order_item_id ${item.sales_order_item_id}`
        );
      }
  
      if (
        item.served_quantity <= 0 ||
        item.served_quantity > orderedQty
      ) {
        throw new BadRequestException(
          `Invalid served quantity for item ${item.sales_order_item_id}`
        );
      }
    }
  
    /* 4️⃣ Decide serve + approval status */
    const isAdmin = user.role === 'admin';
  
    const serveStatus = isAdmin ? 'SERVED' : 'DRAFT';
    const approvalStatus = isAdmin ? 'NOT_REQUIRED' : 'PENDING';
  
    /* 5️⃣ Create serve header */
    const { data: serve, error: serveError } = await sb
      .from('sales_order_serves')
      .insert({
        sales_order_id: orderId,
        requested_by: user.username,
        status: serveStatus,
        approval_status: approvalStatus
      })
      .select()
      .single();
  
    if (serveError || !serve) {
      throw new BadRequestException('Failed to create serve');
    }
  
    /* 6️⃣ Create serve items */
    const serveItems = dto.items.map(i => ({
      sales_order_serve_id: serve.id,
      sales_order_item_id: i.sales_order_item_id,
      served_quantity: i.served_quantity
    }));
  
    const { error: serveItemsError } = await sb
      .from('sales_order_serve_items')
      .insert(serveItems);
  
    if (serveItemsError) {
      throw new BadRequestException('Failed to create serve items');
    }
  
    /* 7️⃣ If admin, mark order as SERVED */
    if (isAdmin) {
      await sb
        .from('sales_orders')
        .update({ status: 'SERVED' })
        .eq('id', orderId);
    }
  
    return {
      message: isAdmin
        ? 'Order served successfully'
        : 'Serve request submitted for approval',
      serve_id: serve.id,
      status: serveStatus,
      approval_status: approvalStatus
    };
  }  
}