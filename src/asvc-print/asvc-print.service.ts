import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SalesOrderType } from './type/so.type';
import { PackingListType } from './type/pl.type';
import { DeliveryReceiptType } from './type/dr.type';
import { PurchaseOrderType } from './type/po.type';

@Injectable()
export class PrintService {
  constructor(private readonly service: SupabaseService) {}

  // ------------------------------------------------------------------------------------------------------------------------------------
  // Sales-Order Get Function
  // ------------------------------------------------------------------------------------------------------------------------------------
  async read_so(id: number) {
    const { data, error } = await this.service.client
      .from('sales_orders')
      .select(`
        id,
        order_date,
        customers ( name, address ),
        sales_order_items ( 
          quantity,
          products ( item_name, unit )
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) throw new NotFoundException('Sales order not found');
    
    const so = data as SalesOrderType;
    return {
      id: so.id ?? '',
      date: so.order_date,
      customerName: so.customers?.name ?? '',
      customerAddress: so.customers?.address ?? '',
      orderedItems: so.sales_order_items.map(item => ({
        itemName: item.products?.item_name ?? '',
        quantity: item.quantity,
        unit: item.products?.unit ?? '',
      })),
    };
  }

  // ------------------------------------------------------------------------------------------------------------------------------------
  // Packing List Get Function
  // ------------------------------------------------------------------------------------------------------------------------------------  
  async read_pl(id: number) {
    const { data, error } = await this.service.client
      .from('sales_invoices')
      .select(`
        id,
        invoice_date,
        order_id,
        customers (
          name,
          address,
          tin
        ),
        sales_invoice_items (
          quantity,
          products (
            item_name,
            unit
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Sales order not found');
    }

    const pl = data as PackingListType;
    const udata = data as any;
    console.log("oid: ",pl.order_id)

    return {
      date: pl.invoice_date,
      orderId: pl.order_id,
      customerName: udata.customers?.name ?? '',
      customerAddress: udata.customers?.address ?? '',
      customerTIN: udata.customers?.tin ?? '',
      items: pl.sales_invoice_items.map(item => ({
        itemName: item.products?.item_name ?? '',
        quantity: item.quantity,
        unit: item.products?.unit ?? '',
        carton: '',
      })),
    };
  }

  async read_dr(id: number) {
    const { data, error } = await this.service.client
      .from('sales_invoices')
      .select(`
        id,
        order_id,
        invoice_number,
        invoice_date,
        waybill_number,
        shipping_date,
        courier,
        customers (
          name,
          address,
          tin
        ),
        sales_invoice_items (
          quantity,
          price,
          products (
            item_name,
            unit
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const row = data as DeliveryReceiptType;

    const urow = data as any;
    const customer = urow.customers;

    return {
      drNo: row.invoice_number ?? '',
      date: row.shipping_date ?? row.invoice_date,
      waybill: row.waybill_number ?? '',
      courier: row.courier ?? '',
      order_id: row.id,
      customerName: customer?.name ?? '',
      customerAddress: customer?.address ?? '',
      customerTIN: customer?.tin ?? '',
      items: row.sales_invoice_items.map(item => ({
        quantity: item.quantity,
        unit: item.products?.unit ?? '',
        itemName: item.products?.item_name ?? '',
        price: item.price,
      })),
    };
  }

  async read_po(id: number) {
    const { data, error } = await this.service.client
      .from('supplier_invoices')
      .select(`
        id,
        invoice_number,
        po_number,
        purchase_date,
        suppliers (
          name,
          address
        ),
        supplier_invoice_items (
          quantity,
          unit_cost,
          products (
            item_name,
            unit
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const row = data as PurchaseOrderType;

    const urow = data as any;
    const supplier = urow.suppliers;

    return {
      invoice_number: row.invoice_number ?? '',
      date: row.purchase_date,
      po_number: row.po_number,
      supplierName: supplier?.name ?? '',
      supplierAddress: supplier?.address ?? '',
      items: row.supplier_invoice_items.map(item => ({
        quantity: item.quantity,
        price: item.unit_cost,
        unit: item.products?.unit ?? '',
        itemName: item.products?.item_name ?? '',
      })),
    };
  }
}