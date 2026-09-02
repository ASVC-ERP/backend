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
import { ReturnSupplierInvoiceDto  } from './dto/create-return.dto';

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
    limit = 50,
    supplier?: number,
    name?: string,
  ) {
    limit = Math.min(limit, 500);
    const from = (page - 1) * limit;
    const to = from + limit - 1;


    let query = this.supabase.client
      .from('supplier_invoices')
      .select(
        `
          *,
          suppliers:suppliers!supplier_id ( id, sid, name ),
          supplier_invoice_items!supplier_invoice_items_invoice_id_fkey (
            id, quantity, unit_cost, subtotal,
            products:product_id ( id, item_name, unit )
          )
        `,
        { count: 'exact' }
      )
      .order('id', { ascending: false });

    if (supplier !== undefined && supplier !== null)
      query = query.eq('supplier_id', Number(supplier));

    if (name && name.trim()) {
      const { data: suppliers, error } = await this.supabase.client
        .from('suppliers')
        .select('id')
        .ilike('name', `%${name.trim()}%`);

      const ids = suppliers?.map(s => s.id) ?? [];

      if (ids.length > 0) {
        query = query.in('supplier_id', ids);
      } else {
        return {
          data: [],
          meta: { page, limit, total: 0, totalPages: 0 },
        };
      }
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw new InternalServerErrorException(error.message);

    return {
      data,
      meta: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), },
    };
  }

  async find_by_id(id: number) {
    const { data, error } = await this.supabase.client
      .from(this.table)
      .select(
        `
            *,
            suppliers (id, name),
            supplier_invoice_items (
                id,
                product_id,
                quantity,
                unit_cost,
                subtotal,
                ret_qty,
                products:product_id ( id, item_code, item_name, unit )
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

  async get_all_returns(page = 1, limit = 50, name?: string) {
    limit = Math.min(limit, 100);
  
    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    let query = this.supabase.client
      .from('supplier_return')
      .select(` id, invoice_id, reason, created_at,
        supplier_invoices!inner (
          id,
          invoice_number,
          po_number,
          purchase_date,
          status,
          supplier_id,
          suppliers!inner ( id, name )
        ),
        supplier_return_items (
          id,
          item_id,
          product_id,
          ret_qty,
          rem_qty,
          created_at,
          products ( id, item_code, item_name, unit )
        )
      `, { count: 'exact' })
      .order('id', { ascending: false });

    if (name?.trim()) {
      query = query.ilike( 'supplier_invoices.suppliers.name', `%${name.trim()}%` );
    }

    const { data, error, count } = await query.range(from, to);
  
    if (error) throw new InternalServerErrorException(error.message);
  
    return {
      data, meta: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), },
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

  async update2(id: number, dto: UpdateSupplierInvoiceDto) {
    // 1. Check invoice first
    const { data: invoice, error: findError } = await this.supabase.client
      .from('supplier_invoices')
      .select('id, status')
      .eq('id', id)
      .single();

  
    if (findError || !invoice) {
      throw new NotFoundException('Supplier invoice not found');
    }

    if (invoice.status === 'Posted') {
      throw new BadRequestException('Cannot edit Posted invoice');
    }

    // 2. Update header
    const { error: updateError } = await this.supabase.client
      .from('supplier_invoices')
      .update({
        invoice_number: dto.invoice_number,
        po_number: dto.po_number,
        purchase_date: dto.purchase_date,
        supplier_id: dto.supplier_id,
        conversion_factor: dto.conversion_factor,
        notes: dto.notes,
      })
      .eq('id', id);

    if (updateError) {
      throw new InternalServerErrorException(updateError.message);
    }

    // 3. Delete old items
    const { error: deleteError } = await this.supabase.client
      .from('supplier_invoice_items')
      .delete()
      .eq('invoice_id', id);
  
    if (deleteError) {
      throw new InternalServerErrorException(deleteError.message);
    }

    // 4. Insert updated items
    const items = dto.items.map((item) => ({
      invoice_id: id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      subtotal: item.quantity * item.unit_cost,
    }));

    const { error: insertError } = await this.supabase.client
      .from('supplier_invoice_items')
      .insert(items);

    if (insertError) {
      throw new InternalServerErrorException(insertError.message);
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
  async returnItems(id: number, dto: ReturnSupplierInvoiceDto) {
    const { data, error } = await this.supabase.client.rpc(
      'create_supplier_return',
      {
        p_invoice_id: id,
        p_reason: dto.reason,
        p_items: dto.items,
      },
    );
  
    if (error) { throw new BadRequestException(error.message); }
    return data;
  }
}
