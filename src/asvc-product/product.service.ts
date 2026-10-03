import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { AdjustPriceDto } from './dto/adjust-price.dto';
import { AdjustCostDto } from './dto/adjust-cost.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { BulkUpdateStatusDto } from './dto/bulk-update-status.dto';

@Injectable()
export class ProductService {
  constructor(private readonly supabase: SupabaseService) {}

  // CREATE
  async create(dto: CreateProductDto) {
    const { data, error } = await this.supabase.client
      .from('products')
      .insert(dto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // READ
  // cannot do a find all function due to limit of 1000 rows only, must be seperated by pages
  async find_by_page(
    page = 1,
    limit = 100,
    search?: string,
    stockStatus?: 'in' | 'out',
    status?: 'active' | 'inactive',
  ) {
    limit = Math.min(limit, 1000);
    const from = (page - 1) * limit;
    const to = from + limit - 1;


    let query = this.supabase.client
      .from('products')
      .select('*', { count: 'exact' })
      .order('stock', { ascending: false })
      .order('id', { ascending: false });

    if (search) {
      const s = search.trim();
      query = query.or(
        `item_name.ilike.%${s}%,item_code.ilike.%${s}%,brand.ilike.%${s}%,model.ilike.%${s}%,origin.ilike.%${s}%`
      );
    }

    if (stockStatus === 'in') {
      query = query.gte('stock', 1);
    } else if (stockStatus === 'out') {
      query = query.eq('stock', 0);
    }

    if (status === 'active' || status === 'inactive') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw new InternalServerErrorException(error.message);

    return {
      data,
      meta: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    };
  }

  async find(id: number) {
    const { data, error } = await this.supabase.client
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Product not found');
    return data;
  }

  async count() {
    const { count, error } = await this.supabase.client
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (error) throw new InternalServerErrorException('Failed to fetch product count');
    return count;
  }

  async search(query: string, limit = 20) {
    const q = query?.trim();
  
    if (!q) {
      return [];
    }
  
    const { data, error } = await this.supabase.client
      .from('products')
      .select(`
          *
      `)
      .or(`item_name.ilike.*${q}*,item_code.ilike.*${q}*`)
      .order('item_name', { ascending: true })
      .limit(limit);
    
    if (error) throw new NotFoundException('Product not found');
    return data;
  }

  async listAdjustments(id: number) {
    const { data, error } = await this.supabase.client
      .from('inventory_adjustments')
      .select('*')
      .eq('product_id', id)

    if (error || !data) throw new NotFoundException('Product not found');
    return data;
  }

  // Products with no sale/purchase in the last `days` (see
  // get_dormant_products -- not date-range scoped, always relative to
  // today). stockStatus splits the same underlying list for its two
  // consumers: 'in' for the Sales Report panel, 'out' for the Dashboard.
  async dormant(stockStatus?: 'in' | 'out', days = 90) {
    const { data, error } = await this.supabase.client.rpc('get_dormant_products', {
      p_days: days,
    });
    if (error) throw new InternalServerErrorException(error.message);

    let rows = (data ?? []) as Array<{ stock: number | null }>;
    if (stockStatus === 'in') rows = rows.filter((r) => Number(r.stock) > 0);
    else if (stockStatus === 'out') rows = rows.filter((r) => !(Number(r.stock) > 0));
    return rows;
  }

  async checkItemCode(itemCode: string) {
    const code = itemCode.trim();
  
    const { data, error } = await this.supabase.client
      .from("products")
      .select("id")
      .ilike("item_code", code)
      .maybeSingle();
  
    if (error) {
      throw new Error(error.message);
    }
  
    return {
      exists: !!data,
    };
  }

  // UPDATE
  async update(id: number, dto: UpdateProductDto) {
    const { data, error } = await this.supabase.client
      .from('products')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Cannot update product');
    return data;
  }

  async adjust_stock(id: number, dto: AdjustStockDto) {
    const { quantity: newStock, pic, remarks } = dto;
    
    if (newStock < 0) 
      throw new BadRequestException('Stock cannot be negative');
  
    const { data: product, error: fetchError } =
    await this.supabase.client
      .from('products')
      .select('id, stock')
      .eq('id', id)
      .single();

    if (fetchError || !product)
      throw new NotFoundException('Product not found');

    const fromQuantity = product.stock;
    const toQuantity = newStock;
    const adjustedQuantity = toQuantity - fromQuantity;

    if (adjustedQuantity === 0)
      return product;

    const { data: updatedProduct, error: updateError } =
    await this.supabase.client
      .from('products')
      .update({ stock: toQuantity })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    const { error: logError } = await this.supabase.client
    .from('inventory_adjustments')
    .insert({
      adjustment_date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      product_id: id,
      from_quantity: fromQuantity,
      to_quantity: toQuantity,
      adjusted_quantity: adjustedQuantity,
      pic,
      remarks,
    });

    if (logError) throw logError;
    return updatedProduct;
  }

  async adjust_price(id: number, dto: AdjustPriceDto) {
    const { data, error } = await this.supabase.client
      .from('products')
      .update({ price4: dto.price4 })
      .eq('id', id)
      .select()
      .single();
  
    if (error || !data) throw new NotFoundException('Cannot adjust price');
    return data;
  }

  async update_status(id: number, dto: UpdateProductStatusDto) {
    const { data, error } = await this.supabase.client
      .from('products')
      .update({ status: dto.status })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Cannot update product status');
    return data;
  }

  // RPC, not .update().in(dto.ids) -- that encodes the id list into the
  // request's query string, which starts failing once the list is long
  // enough (a few thousand ids). This sends them in the request body
  // instead, which has no comparable limit.
  async bulk_update_status(dto: BulkUpdateStatusDto) {
    const { data, error } = await this.supabase.client.rpc('bulk_update_product_status', {
      p_ids: dto.ids,
      p_status: dto.status,
    });

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async adjust_cost(id: number, dto: AdjustCostDto, changedBy?: number) {
    // adjust_product_cost updates cost + prices AND writes a product_cost_history
    // row ('manual') in one transaction.
    const { data, error } = await this.supabase.client.rpc('adjust_product_cost', {
      p_id: id,
      p_cost: dto.cost,
      p_changed_by: changedBy ?? null,
    });

    if (error || !data) throw new NotFoundException('Cannot adjust cost');
    return Array.isArray(data) ? data[0] : data;
  }

  // DELETE
  async remove(id: number) {
    try {
      const { data: existingProduct, error: fetchError } = await this.supabase.client
        .from('products')
        .select('id, item_name')
        .eq('id', id)
        .single();
  
      if (fetchError) throw new NotFoundException(`Product with ID ${id} not found`); 
  
      const { error } = await this.supabase.client
        .from('products')
        .delete()
        .eq('id', id);
  
      if (error) {
        if (error.code === '23503')
          throw new BadRequestException( `Cannot delete ${existingProduct.item_name} with ID ${id}. This product is referenced by other records (orders, inventory, etc.)` );
        throw new InternalServerErrorException( `Failed to delete product: ${error.message}` );
      }
  
      return { message: `Product with ID ${id} deleted successfully` };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) throw error;
      throw new InternalServerErrorException( `An unexpected error occurred while deleting product with ID ${id}` );
    }
  }
}
