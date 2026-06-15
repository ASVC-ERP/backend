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

  private readonly table = 'supplier_invoices';
  private readonly tableItems = 'supplier_invoice_items';
  private readonly returnTable = 'supplier_return';
  private readonly returnTableItems = 'supplier_return_items';

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

    console.log(error);

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

    // =====================================================
    // 1. Create supplier_return Header
    // =====================================================
    const { data: returnHeader, error: returnError } = await supabase
      .from(this.returnTable)
      .insert({ 
        invoice_id: id,
        reason: dto.reason, 
      })
      .select()
      .single();
    if (returnError) throw new BadRequestException(returnError.message);

    // =====================================================
    // 2. Get supplier_invoice_items being returned
    // =====================================================
    const invoiceItemIds = dto.items.map(item => item.item_id);
    const { data: invoiceItems, error: invError } = await supabase
      .from(this.tableItems)
      .select(`
        id,
        product_id,
        quantity,
        ret_qty
      `)
      .in('id', invoiceItemIds);
    if (invError) throw new BadRequestException(invError.message);

    // =====================================================
    // 3. Validate return quantities
    //
    // Example:
    // Purchased = 100
    // Already Returned = 30
    // New Return = 20
    // Total Return = 50 (VALID)
    //
    // Purchased = 100
    // Already Returned = 90
    // New Return = 20
    // Total Return = 110 (INVALID)
    // =====================================================
    for (const item of dto.items) {
      const invoiceItem = invoiceItems.find( i => i.id === item.item_id, );
      if (!invoiceItem) throw new BadRequestException( `Invoice item ${item.item_id} not found`, );

      const alreadyReturned = Number(invoiceItem.ret_qty);
      const requestedReturn = Number(item.qty);
      const totalAfterReturn = alreadyReturned + requestedReturn;
      if (totalAfterReturn > invoiceItem.quantity) throw new BadRequestException(`Exceeds allowed return. Purchased: ${invoiceItem.quantity}, Already Returned: ${alreadyReturned}, Trying To Return: ${requestedReturn}`,);
    }

    // =====================================================
    // 4. Create supplier_return_items Detail Records
    // =====================================================
    const returnItemsPayload = dto.items.map(item => ({
      return_id: returnHeader.id,
      item_id: item.item_id,
      qty: item.qty,
    }));

    const { data: returnItems, error: itemError } = await supabase
      .from('supplier_return_items')
      .insert(returnItemsPayload)
      .select();

    if (itemError) throw new BadRequestException(itemError.message);

    // =====================================================
    // 5. Update Inventory Stock
    // 6. Update supplier_invoice_items.ret_qty
    // =====================================================
    for (const item of dto.items) {
      const invoiceItem = invoiceItems.find( i => i.id === item.item_id, );
      if (!invoiceItem) continue;

      // -------------------------------------
      // Get Current Product Stock
      // -------------------------------------
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', invoiceItem.product_id)
        .single();
      if (productError) throw new BadRequestException(productError.message);

      // -------------------------------------
      // Reduce Inventory Stock
      // -------------------------------------
      const newStock = Number(product.stock) - Number(item.qty);
      const { error: stockUpdateError } = await supabase
        .from('products')
        .update({ stock: newStock, })
        .eq('id', invoiceItem.product_id);
      if (stockUpdateError) throw new BadRequestException( stockUpdateError.message, );

      // -------------------------------------
      // Update Returned Quantity
      //
      // Example:
      // Current ret_qty = 10
      // Returning = 5
      // New ret_qty = 15
      // -------------------------------------
      const newReturnedQty = Number(invoiceItem.ret_qty) + Number(item.qty);
      const { error: returnQtyError } = await supabase
        .from('supplier_invoice_items')
        .update({ ret_qty: newReturnedQty, })
        .eq('id', item.item_id);
      if (returnQtyError) throw new BadRequestException( returnQtyError.message, );
    }

    // =====================================================
    // Return Response
    // =====================================================
    return {
      return: returnHeader,
      items: returnItems,
    };
  }

  async rpc_return_items(id: number, dto: ReturnDto) {
    const supabase = this.supabase.client;
    const { data, error } = await supabase.rpc('create_supplier_return', {
      p_invoice_id: id,
      p_reason: dto.reason,
      p_items: dto.items,
    });

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
