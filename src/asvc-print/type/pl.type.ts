export type PackingListType = {
    order_date: string;
    status: string;
    customers?: {
      name?: string | null;
      address?: string | null;
      tin?: string | null;
    } | null;
    sales_order_items: {
      quantity: number;
      products?: {
        item_name?: string | null;
        unit?: string | null;
      } | null;
    }[];
  };
  