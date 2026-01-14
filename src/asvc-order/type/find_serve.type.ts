export type ServeItemRow = {
    id: number;
    quantity_ordered: number;
    quantity_to_serve: number;
    sales_orders?: {
        status?: string | null;
        customers?: {
        name?: string | null;
        } | null;
    } | null;
};    
  