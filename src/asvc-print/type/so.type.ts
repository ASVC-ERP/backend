export type SalesOrderType = {
    id: number;
    order_code: string;
    order_date: string;
    status: string;
    approval_status: string;
    customers?: {
      cid?: string | null;
      name?: string | null;
      address?: string | null;
      tin?: string | null;
    } | null;
    sales_order_items: {
      quantity: number;
      price: number;
      products?: {
        item_code?: string | null;
        item_name?: string | null;
        unit?: string | null;
      } | null;
    }[];
  };
  