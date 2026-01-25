export type SalesOrderType = {
    id: number;
    order_date: string;
    customers?: {
      name?: string | null;
      address?: string | null;
    } | null;
    sales_order_items: {
      quantity: number;
      products?: {
        item_name?: string | null;
        unit?: string | null;
      } | null;
    }[];
  };
  