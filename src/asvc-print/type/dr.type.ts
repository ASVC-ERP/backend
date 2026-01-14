export type DeliveryReceiptType = {
    id: number;
    invoice_number?: string | null;
    invoice_date?: string | null;
    waybill_number?: string | null;
    shipping_date?: string | null;
    courier?: string | null;
  
    sales_orders: {
      id: number;
      order_code?: string | null;
      customers: {
        name?: string | null;
        address?: string | null;
        tin?: string | null;
      }[];
    }[];
  
    sales_invoice_items: {
      quantity: number;
      price: number;
      products: {
        item_name?: string | null;
        unit?: string | null;
      } | null;
    }[];
  };
  