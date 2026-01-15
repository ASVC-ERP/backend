import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { AdjustPriceDto } from './dto/adjust-price.dto';

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

  // READ ALL
  async find_all() {
    const { data, error } = await this.supabase.client
      .from('products')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true }) 

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async find_by_page(
    page = 1, 
    limit = 50,
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
      query = query.or(
        `item_name.ilike.%${search}%,item_code.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

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

  // READ ONE
  async find(id: number) {
    const { data, error } = await this.supabase.client
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Product not found');
    }

    return data;
  }

  async get_details(item_name: string) {
    const { data, error } = await this.supabase.client
      .from('products')
      .select('*')
      .ilike('item_name', `%${item_name}%`)

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async search(search: string) {
    const { data, error } = await this.supabase.client
      .from('products')
      .select('*')
      .or(
        `item_name.ilike.%${search}%,item_code.ilike.%${search}%`
      )
      .order('item_name', { ascending: true })
      .limit(20);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async list_adjust(id: number) {
    const { data, error } = await this.supabase.client
      .from('inventory_adjustments')
      .select('*')
      .eq('product_id', id)

    if (error || !data) {
      throw new NotFoundException('Product not found');
    }
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

    if (error || !data) {
      throw new NotFoundException('Product not found');
    }

    return data;
  }

  async adjust_stock(id: number, dto: AdjustStockDto) {
    const { data: product } = await this.supabase.client
      .from('products')
      .select('stock')
      .eq('id', id)
      .single();
  
    if (!product) throw new NotFoundException('Product not found');
  
    const newStock = dto.quantity;
  
    if (newStock < 0) {
      throw new BadRequestException('Stock cannot be negative');
    }
  
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
  
    if (error || !data) {
      throw new NotFoundException('Product not found');
    }
  
    return data;
  }

  // DELETE
  async remove(id: number) {
    const { error } = await this.supabase.client
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { message: 'Product deleted successfully' };
  }
}
