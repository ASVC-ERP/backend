export type ServeItemRow = {
    id: number;
    quantity_ordered: number;
    quantity_to_serve: number;
    sales_orders?: {
        status?: string | null;
        order_code?: string | null;
        order_date?: string | null;
        customers?: {
        name?: string | null;
        } | null;
    } | null;
};    
  