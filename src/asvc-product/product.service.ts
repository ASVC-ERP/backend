import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { AdjustPriceDto } from './dto/adjust-price.dto';
import { AdjustCostDto } from './dto/adjust-cost.dto';

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
    limit = 30,
    search?: string,
  ) {
    limit = Math.min(limit, 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log({ page, limit, from, to, search });

    let query = this.supabase.client
      .from('products')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true });

    if (search) {
      query = query.or(`item_name.ilike.%${search}%,item_code.ilike.%${search}%`);
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

  async search(query: string, limit = 20) {
    const q = query?.trim();
  
    if (!q) {
      return [];
    }
  
    const { data, error } = await this.supabase.client
      .from('products')
      .select(`
          id,
          item_code,
          item_name,
          unit,
          stock
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
    const newStock = dto.quantity;
    if (newStock < 0) throw new BadRequestException('Stock cannot be negative');
  
    const { data, error } = await this.supabase.client
      .from('products')
      .update({ stock: newStock })
      .eq('id', id)
      .select()
      .single();
  
    if (error) throw error;
    return data;
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

  async adjust_cost(id: number, dto: AdjustCostDto) {
    const { data, error } = await this.supabase.client
      .from('products')
      .update({ cost: dto.cost })
      .eq('id', id)
      .select()
      .single();
  
    if (error || !data) throw new NotFoundException('Cannot adjust cost');
    return data;
  }

  // DELETE
  async remove(id: number) {
    const { error } = await this.supabase.client
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException('Cannot Delete Product.');;
    return { message: 'Product deleted successfully' };
  }
}
