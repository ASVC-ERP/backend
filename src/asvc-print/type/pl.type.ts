export type PackingListType = {
    id: number;
    invoice_date?: string | null;

    sales_invoice_items: {
      quantity: number;
      products: {
        item_name?: string | null;
        unit?: string | null;
      } | null;
    }[];
  };
  