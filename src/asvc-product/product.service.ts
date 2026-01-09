import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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
  async find_by_page(page = 1, limit = 500) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log({ page, limit, from, to });

    const { data, error, count } = await this.supabase.client
      .from('products')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true }) 
      .range(from, to);

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

  /*
  async findAll() {
    const { data, error } = await this.supabase.client
      .from('products')
      .select('*')
      .order('item_name');

    if (error) throw error;
    return data;
  }
  */

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
