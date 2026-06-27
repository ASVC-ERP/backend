export type PackingListType = {
    id: number;
    invoice_date?: string | null;
    order_id?: number | null;

    sales_invoice_items: {
      quantity: number;
      products: {
        item_name?: string | null;
        unit?: string | null;
      } | null;
    }[];
  };
  