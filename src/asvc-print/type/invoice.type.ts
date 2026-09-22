export type SalesInvoiceType = {
  id: number;
  order_id: number;
  invoice_number?: string | null;
  invoice_date?: string | null;
  total_price?: number | null;

  customers?: {
    name?: string | null;
    address?: string | null;
    number?: string | null;
    tin?: string | null;
    terms?: string | null;
  } | null;

  sales_invoice_items: {
    quantity: number;
    price: number;
    return_qty?: number | null;
    products: {
      item_code?: string | null;
      item_name?: string | null;
      unit?: string | null;
    } | null;
  }[];
};
