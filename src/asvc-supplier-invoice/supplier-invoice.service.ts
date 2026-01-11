import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateSupplierInvoiceDto } from './dto/update-invoice.dto';
import { CreateSupplierInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class SupplierInvoiceService {
    constructor(private readonly supabase: SupabaseService) {}

    async create(dto: CreateSupplierInvoiceDto) {
        const { items, ...invoiceData } = dto;

        const { data: invoice, error: invoiceError } =
            await this.supabase.client
            .from('supplier_invoices')
            .insert({
                ...invoiceData,
                status: 'Pending'
            })
            .select()
            .single();

        if (invoiceError) throw invoiceError;

        const invoiceItems = items.map(item => ({
            invoice_id: invoice.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            subtotal: item.quantity * item.unit_cost
        }));

        const { error: itemsError } = await this.supabase.client
            .from('supplier_invoice_items')
            .insert(invoiceItems);

        if (itemsError) throw itemsError;

        return invoice;
    }

    async post_invoice(id: number) {
      // 1. Fetch invoice
      const { data: invoice, error: invoiceError } =
        await this.supabase.client
          .from('supplier_invoices')
          .select('id, status')
          .eq('id', id)
          .single();
    
      if (invoiceError || !invoice) {
        throw new NotFoundException('Invoice not found');
      }
    
      if (invoice.status !== 'Pending') {
        throw new BadRequestException('Invoice already posted');
      }
    
      // 2. Fetch invoice items
      const { data: items, error: itemsError } =
        await this.supabase.client
          .from('supplier_invoice_items')
          .select('product_id, quantity')
          .eq('invoice_id', id);
    
      if (itemsError || !items.length) {
        throw new BadRequestException('No invoice items found');
      }
    
      // 3. Add stock to products
      for (const item of items) {
        const { error: stockError } = await this.supabase.client
          .rpc('increment_product_stock', {
            p_product_id: item.product_id,
            p_qty: item.quantity,
          });
    
        if (stockError) throw stockError;
      }
    
      // 4. Mark invoice as POSTED
      const { error: updateError } = await this.supabase.client
        .from('supplier_invoices')
        .update({ status: 'Posted' })
        .eq('id', id);
    
      if (updateError) throw updateError;
    
      return { posted: true };
    }
      
    
    async findAll() {
        const { data, error } = await this.supabase.client
            .from('supplier_invoices')
            .select(`
            *,
            supplier_invoice_items (
                id,
                product_id,
                quantity,
                unit,
                unit_cost,
                subtotal
            )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }
    
    async find(id: number) {
        const { data, error } = await this.supabase.client
            .from('supplier_invoices')
            .select(`
            *,
            supplier_invoice_items (
                id,
                product_id,
                quantity,
                unit,
                unit_cost,
                subtotal
            )
            `)
            .eq('id', id)
            .single();

        if (error || !data) {
            throw new NotFoundException('Invoice not found');
        }

        return data;
    }

    /* ================= UPDATE ================= */
    async update(id: number, dto: UpdateSupplierInvoiceDto) {
        // Ensure invoice exists
        const { data: invoice, error: findError } =
          await this.supabase.client
            .from('supplier_invoices')
            .select('id, status')
            .eq('id', id)
            .single();
      
        if (findError || !invoice) {
          throw new NotFoundException('Supplier invoice not found');
        }
    
        // Optional: prevent editing posted invoices
        if (invoice.status === 'Posted') {
          throw new BadRequestException('Cannot edit Posted invoice');
        }
      
        // Update invoice header
        const { error: updateError } = await this.supabase.client
          .from('supplier_invoices')
          .update({
            po_number: dto.po_number,
            purchase_date: dto.purchase_date,
            supplier_id: dto.supplier_id,
            conversion_factor: dto.conversion_factor,
          })
          .eq('id', id);
      
        if (updateError) throw updateError;
      
        // 4Delete existing items
        const { error: deleteError } = await this.supabase.client
          .from('supplier_invoice_items')
          .delete()
          .eq('invoice_id', id);
      
        if (deleteError) throw deleteError;
      
        // 5️⃣ Insert new items
        const itemsPayload = dto.items.map(item => ({
          invoice_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          subtotal: item.quantity * item.unit_cost,
        }));
      
        const { error: insertError } = await this.supabase.client
          .from('supplier_invoice_items')
          .insert(itemsPayload);
      
        if (insertError) throw insertError;
      
        return { updated: true };
    }
      

    /* ================= DELETE ================= */
    async remove(id: number) {
        // delete items first (FK constraint)
        await this.supabase.client
            .from('supplier_invoice_items')
            .delete()
            .eq('invoice_id', id);

        const { error } = await this.supabase.client
            .from('supplier_invoices')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return { message: 'Invoice deleted' };
    }
      
}
