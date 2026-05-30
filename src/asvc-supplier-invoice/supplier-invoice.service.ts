import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateSupplierInvoiceDto } from './dto/update-invoice.dto';
import { CreateSupplierInvoiceDto } from './dto/create-invoice.dto';
import { ReturnDto } from './dto/return-item.dto';

@Injectable()
export class SupplierInvoiceService {
  constructor(private readonly supabase: SupabaseService) {}

  private readonly table = 'supplier_invoices'

  /* ================= CREATE ================= */
  async create(dto: CreateSupplierInvoiceDto) {
    const { items, ...invoiceData } = dto;
    const { data, error } = await this.supabase.client.rpc(
      'create_supplier_invoice',
      {
        invoice_data: invoiceData,
        items,
      },
    );

    if (error) throw new BadRequestException("Failed to create invoice");
    return data;
  }

  async post_invoice(id: number) {
    const { error } = await this.supabase.client.rpc(
      'post_supplier_invoice',
      {
        p_invoice_id: id,
      },
    );

    if (error) throw new BadRequestException(error.message);
    return { posted: true };
  }

  /* ================= READ ================= */
  async find_by_page(
    page = 1, 
    limit = 30,
    supplier?: number,
  ) {
    limit = Math.min(limit, 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log({ page, limit, from, to });

    let query = this.supabase.client
      .from('supplier_invoices')
      .select(
        `
          *,
          supplier_invoice_items!supplier_invoice_items_invoice_id_fkey (
            id,
            quantity,
            unit_cost,
            subtotal,
            products:product_id (
              id,
              item_name,
              unit
            )
          )
        `,
        { count: 'exact' }
      )
      .order('id', { ascending: false });

    if (supplier !== undefined && supplier !== null) {
      query = query.eq('supplier_id', Number(supplier));
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw new InternalServerErrorException(error.message);

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

  async find_by_id(id: number) {
    const { data, error } = await this.supabase.client
      .from(this.table)
      .select(
        `
            *,
            supplier_invoice_items (
                id,
                product_id,
                quantity,
                unit_cost,
                subtotal
            )
            `,
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Invoice not found');
    }

    return data;
  }

  async get_costs(productId: number) {
    const { data, error } = await this.supabase.client
    .rpc( 'get_invoices_by_product', { p_product_id: productId }, );

    if (error) throw error;
    return data;
  }

  async get_all_returns(
    page = 1,
    limit = 50,
  ) {
    limit = Math.min(limit, 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log({ page, limit, from, to });

    let query = this.supabase.client
      .from('supplier_return')
      .select(`*`, { count: 'exact' } )
      .order('id', { ascending: false });

    const { data, error, count } = await query.range(from, to);
    if (error) throw new InternalServerErrorException(error.message);

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

  /* ================= UPDATE ================= */
  async update(id: number, dto: UpdateSupplierInvoiceDto) {
    const { error } = await this.supabase.client.rpc(
      'update_supplier_invoice',
      {
        p_invoice_id: id,
        p_po_number: dto.po_number,
        p_purchase_date: dto.purchase_date,
        p_supplier_id: dto.supplier_id,
        p_conversion_factor: dto.conversion_factor,
        p_items: dto.items,
      },
    );
  
    if (error) {
      if (error.message.includes('not found')) throw new NotFoundException(error.message);
      if (error.message.includes('Posted')) throw new BadRequestException(error.message);
      throw new InternalServerErrorException('Failed to update supplier invoice',);
    }
  
    return { updated: true };
  }

  /* ================= DELETE ================= */
  async remove(id: number) {
    await this.supabase.client
      .from('supplier_invoice_items')
      .delete()
      .eq('invoice_id', id);

    const { error } = await this.supabase.client
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { message: 'Invoice deleted' };
  }

  /* ================= OTHER FUNCTIONS ================= */
  async return_items(id: number, dto: ReturnDto) {
    const supabase = this.supabase.client;

    // Create Header
    const { data: returnHeader, error: returnError } =
      await supabase
        .from('supplier_return')
        .insert({ invoice_id: id, })
        .select()
        .single();

    if (returnError) { throw new BadRequestException(returnError.message); }

    // Append returned items
    const invoiceItemIds = dto.items.map(i => i.item_id);

    const { data: invoiceItems, error: invError } = await supabase
      .from('supplier_invoice_items')
      .select('id, product_id, quantity')
      .in('id', invoiceItemIds);

    if (invError) { throw new BadRequestException(invError.message); }

    const { data: previousReturns } = await supabase
      .from('supplier_return_items')
      .select('item_id, ret_qty')
      .in('item_id', invoiceItemIds);

    const returnedMap = new Map<number, number>();

    for (const r of previousReturns || []) {
      returnedMap.set(
        r.item_id,
        (returnedMap.get(r.item_id) || 0) + Number(r.ret_qty),
      );
    }

    for (const item of dto.items) {
      const invoiceItem = invoiceItems.find( (i) => i.id === item.item_id, );
      if (!invoiceItem) { throw new BadRequestException( `Invoice item ${item.item_id} not found`, ); }
      const alreadyReturned = returnedMap.get(item.item_id) || 0;
      const totalAfter = alreadyReturned + item.ret_qty;

      console.log(alreadyReturned, totalAfter);

      if (totalAfter > invoiceItem.quantity) {
        throw new BadRequestException(
          `Exceeds allowed return. Purchased: ${invoiceItem.quantity}, Already returned: ${alreadyReturned}, Trying: ${item.ret_qty}`,
        );
      }
    }

    const items = dto.items.map((item) => ({
      return_id: returnHeader.id,
      item_id: item.item_id,
      ret_qty: item.ret_qty,
    }));

    const { data: returnItems, error: itemError } =
      await supabase
        .from('supplier_return_items')
        .insert(items)
        .select();

    if (itemError) { throw new BadRequestException(itemError.message); }

    // Update Stock
    for (const item of dto.items) {
      const invoiceItem = invoiceItems.find( (i) => i.id === item.item_id, );

      if (!invoiceItem) { throw new BadRequestException( `Invoice item ${item.item_id} not found`, ); }

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', invoiceItem.product_id)
        .single();

      if (productError) { throw new BadRequestException(productError.message); }

      const newStock = product.stock - item.ret_qty;
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', invoiceItem.product_id);

      if (updateError) { throw new BadRequestException(updateError.message); }
    }

    return {
      return: returnHeader,
      items: returnItems,
    };
  }

  async rpc_return_items(id: number, dto: ReturnDto) {
    const supabase = this.supabase.client;
    const { data, error } = await supabase.rpc('create_supplier_return', {
      p_invoice_id: id,
      p_items: dto.items,
    });

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
