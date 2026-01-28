import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ConflictException
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSalesOrderDto } from './dto/create-order.dto';
import { UpdateSalesOrderDto } from './dto/update-order.dto';

const ORDER_COLUMNS = [
  'id',
  'order_date',
  'status',
  'total_price',
  'created_at',
] as const;

const CUSTOMER_COLUMNS = ['name'] as const;

@Injectable()
export class OrderService {
  constructor(private readonly supabase: SupabaseService) {}

  private readonly table = 'sales_orders';

  // ====================================================================================================================================
  // CREATE API CALL
  // ====================================================================================================================================
  // API: localhost:3000/api/order/
  // SAMPLE PAYLOAD:
  /* 
        {
          "cid": 3,
          "order_date": "2026-01-23",
          "discount": 0,
          "items": [
              {
                  "price": 320,
                  "item_id": 2,
                  "quantity": 10
              },
              {
                  "price": 320,
                  "item_id": 3,
                  "quantity": 20
              }
          ]
        }
  */
  // ====================================================================================================================================

  async create(dto: CreateSalesOrderDto) {
    console.log(dto);
    const { data, error } = await this.supabase.client.rpc('create_sales_order',{
        p_cid: dto.cid,
        p_sales_agent: dto.sales_agent,
        p_discount: dto.discount ?? 0,
        p_items: dto.items
      });
    
    if (error) throw new BadRequestException(error.message);;
    return { created: true };
  }

  // ====================================================================================================================================
  // READ BY PAGE API CALL
  // ====================================================================================================================================
  // DESCRIPTION: This API call reads a maximum of 30 orders per page. This is done due to the limited rows (1000) for read requests
  // API: localhost:3000/api/order?=
  // PARAMETERS:
  //    customer (customer name only)
  //    status (Open, Served, Partial Served)
  //    sortBy (id, order_date, status, total_price, created_at)
  //    sortDir (asc or desc)
  // SAMPLE PAYLOAD: NA
  // ====================================================================================================================================

  async get_by_page( 
    page = 1, 
    limit = 30, 
    status?: string, 
    customer?: string, 
    sortBy = 'id', 
    sortDir: 'asc' | 'desc' = 'desc'
  ) {
    limit = Math.min(limit, 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const safeSortDir = sortDir === 'asc' ? 'asc' : 'desc';

    let query = this.supabase.client
      .from(this.table)
      .select(`
          *,
          customer:customers!sales_orders_cid_fkey!inner (
            id,
            name,
            address
          ),
          user:users!sales_orders_sales_agent_fkey!inner (
            id,
            name
          )`,
        { count: 'exact' }
      )

    if (status) 
      query = query.eq('status', status);
    if (customer?.trim()) 
      query = query.ilike('customer.name', `%${customer.trim()}%`);

    if (sortBy.startsWith('customer.')) {
      const column = sortBy.replace('customer.', '');
      if (CUSTOMER_COLUMNS.includes(column as any)) {
        query = query.order(column, {
          ascending: safeSortDir === 'asc',
          foreignTable: 'customer',
        });
      }
    }
    else if (ORDER_COLUMNS.includes(sortBy as any)) 
      query = query.order(sortBy, { ascending: safeSortDir === 'asc' });
    else 
      query = query.order('id', { ascending: false });
  
    
    const { data, error, count } = await query.range( from, to );

    if (error) throw new InternalServerErrorException(error.message);

    return {
      data,
      meta: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), },
    };
  }

  // ====================================================================================================================================
  // READ BY ID
  // ====================================================================================================================================
  // DESCRIPTION: This API call reads a maximum of 30 orders per page. This is done due to the limited rows (1000) for read requests
  // API: localhost:3000/api/order/
  // SAMPLE PAYLOAD: NA
  // ====================================================================================================================================

  async find(id: number) {
    const { data, error } = await this.supabase.client
      .from('sales_orders')
      .select(`
        id,
        order_date,
        status,
        total_price,
        discount,
        approval_status,
        users ( id, username, name, role ),
        customers ( id, name, address, number ),
        sales_order_items ( 
          id, quantity, serve_qty, price, 
          products ( id, item_code, item_name, unit, stock )
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    return {
      id: data.id,
      order_date: data.order_date,
      status: data.status,
      total_price: data.total_price,
      discount: data.discount,
      approval_status: data.approval_status,
      sales_agent: data.users,
      customer: data.customers,
      items: data.sales_order_items,
    };
  }

  async get_order_items_for_edit(orderId: number) {
    const { data, error } = await this.supabase.client
      .from('sales_order_items')
      .select(`
        id,
        quantity,
        price,
        product:products!sales_order_items_item_id_fkey!inner (
          id,
          item_code,
          item_name,
          price1,
          price2,
          price3,
          price4
        )
      `)
      .eq('sales_order_id', orderId);

    if (error) throw new InternalServerErrorException(error.message);

    return data.map((item) => {
      const product = item.product as any;
      if (!product) return null;

      const prices = [
        product.price1,
        product.price2,
        product.price3,
        product.price4,
      ]
        .filter((p) => p !== null && p !== undefined)
        .map(Number);

      const orderedPrice = Number(item.price);
      console.log(orderedPrice);

      const ret = {
        id: item.id,
        item_id: product.id,
        item_code: product.item_code,
        item_name: product.item_name,
        quantity: item.quantity,
        orderedPrice,
        availablePrices: prices,
        customPriceEnabled: !prices.includes(orderedPrice),
      }

      console.log(ret);

      return {
        id: item.id,
        item_id: product.id,
        item_code: product.item_code,
        item_name: product.item_name,
        quantity: item.quantity,
        orderedPrice,
        availablePrices: prices,
        customPriceEnabled: !prices.includes(orderedPrice),
      };
    });
  }
  

  async getServedOrdersByItem(id: number) {
    const { data, error } = await this.supabase.client.rpc(
      'get_served_orders_by_item',
      { p_item_id: id },
    );
  
    if (error) throw error;
    return data;
  }

  // ====================================================================================================================================
  // UPDATE API CALL
  // API: localhost:3000/api/order/id/:id
  // SAMPLE PAYLOAD:
  /* 
        {
          "cid": 3,
          "order_date": "2026-01-23",
          "discount": 0,
          "items": [
              {
                  "price": 320,
                  "item_id": 2,
                  "quantity": 10
              },
              {
                  "price": 320,
                  "item_id": 3,
                  "quantity": 20
              }
          ]
        }
  */
  // ====================================================================================================================================
  async update(id: number, dto: UpdateSalesOrderDto) {
    const { error } = await this.supabase.client.rpc('update_sales_order', {
        payload: {
          order_id: id,
          cid: dto.cid,
          order_date: dto.order_date,
          discount: dto.discount ?? 0,
          items: dto.items,
    }});
  
    if (error) throw new BadRequestException(error.message);;
    return { updated: true };
  }
  

  // ====================================================================================================================================
  // DELETE API CALL
  // API: localhost:3000/api/order/id/:id
  // SAMPLE PAYLOAD: NA
  // ====================================================================================================================================
  async delete(id: number) {
    const { error } = await this.supabase.client.rpc('delete_sales_order', { 
      p_order_id: id 
    });
  
    if (error) {
      if (error.message.includes('not found')) throw new NotFoundException(`Order ${id} not found`);
      throw new BadRequestException(error.message);
    }
    return { deleted: true };
  }

  // ====================================================================================================================================
  // SERVE API CALL
  // API: localhost:3000/api/orders/:id/serve
  // SAMPLE PAYLOAD: 
  /*
      {
        "items": [
          { "order_item_id": 15, "serve_qty": 10 },
          { "order_item_id": 16, "serve_qty": 20 }
        ]
      }
  */
  // ====================================================================================================================================
  async serve(
    id: number,
    items: { order_item_id: number; serve_qty: number }[],
  ) {
    const { error } = await this.supabase.client
      .rpc('serve_order', {
        p_order_id: id,
        p_items: items,
      });
  
    if (error) throw new BadRequestException(error.message);
    return { serve: true };
  }

  // ====================================================================================================================================
  // REQUEST SERVE API CALL
  // API: localhost:3000/api/orders/:id/request
  // SAMPLE PAYLOAD: 
  /*
      {
        "items": [
          { "order_item_id": 15, "serve_qty": 10 },
          { "order_item_id": 16, "serve_qty": 20 }
        ]
      }
  */
  // ====================================================================================================================================
  async request_serve(
    id: number,
    items: { order_item_id: number; serve_qty: number }[],
  ) {
    const { error } = await this.supabase.client
      .rpc('request_serve_order', {
        p_order_id: id,
        p_items: items,
      });
  
    if (error) throw new BadRequestException(error.message);
    return { request: true };
  }

  // ====================================================================================================================================
  // APPROVE API CALL
  // API: localhost:3000/api/orders/:id/approve
  // SAMPLE PAYLOAD: NA
  // ====================================================================================================================================
  async approve(id: number) {
    const { error } = await this.supabase.client
      .rpc('approve_serve_order', {
        p_order_id: id,
      });
  
    if (error) throw new BadRequestException(error.message);
    return { approved: true };
  }

  // ====================================================================================================================================
  // REJECT API CALL
  // API: localhost:3000/api/orders/:id/reject
  // SAMPLE PAYLOAD: NA
  // ====================================================================================================================================
  async reject(id: number) {
    const { error } = await this.supabase.client
      .rpc('reject_serve_order', {
        p_order_id: id,
      });
  
    if (error) throw new BadRequestException(error.message);
    return { rejected: true };
  }

  // ====================================================================================================================================
  // UNSERVE API CALL
  // API: localhost:3000/api/orders/:id/unserve
  // SAMPLE PAYLOAD: NA
  // ====================================================================================================================================
  async unserve(id: number) {
    const { error } = await this.supabase.client
      .rpc('unserve_order', {
        p_order_id: id,
      });
  
    if (error) throw new BadRequestException(error.message);
    return { unserve: true };
  }

  // ====================================================================================================================================
  // INVOICE API CALL
  // API: localhost:3000/api/orders/:id/unserve
  // SAMPLE PAYLOAD: NA
  // ====================================================================================================================================
  async invoice(id: number) {
    const { data, error } = await this.supabase.client
      .rpc('create_sales_invoice', {
        p_order_id: id,
      });
    if (error) {
      if (error.message.includes('not found'))
        throw new BadRequestException(error.message);
      if (error.message.includes('already exists'))
        throw new ConflictException(error.message);
      if (error.message.includes('cannot be invoiced'))
        throw new BadRequestException(error.message);
      throw new BadRequestException(error.message);
    }
    return data;
  }
}
