export type PurchaseOrderType = {
    id: number;
    invoice_number?: string | null;
    po_number?: string | null;
    purchase_date?: string | null;
  
    supplier_invoice_items: {
      quantity: number;
      unit_cost: number;
      products: {
        item_name?: string | null;
        unit?: string | null;
      } | null;
    }[];
  };
  