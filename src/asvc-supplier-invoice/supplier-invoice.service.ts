import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateSupplierInvoiceDto } from './dto/update-invoice.dto';
import { CreateSupplierInvoiceDto } from './dto/create-invoice.dto';

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

    if (supplier) {
      query = query.eq('supplier_id', supplier);
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
      .from('supplier_invoice_items')
      .select(
        `
        unit_cost,
        quantity,
        products (
          id,
          item_name
        ),
        supplier_invoices (
          id,
          invoice_number,
          po_number,
          purchase_date,
          conversion_factor,
          suppliers (
            id,
            name,
            currency
          )
        )
      `,
      )
      .eq('product_id', productId)
      .order('purchase_date', {
        foreignTable: this.table,
        ascending: false,
      });

    if (error) throw error;
    return data;
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
}
