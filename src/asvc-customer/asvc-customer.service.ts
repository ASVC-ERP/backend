import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private readonly supabase: SupabaseService) {}

  private table = 'customers';

  async create(dto: CreateCustomerDto) {
    const { data, error } = await this.supabase.client
      .from(this.table)
      .insert([{ ...dto }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async read() {
    const { data, error } = await this.supabase.client
      .from(this.table)
      .select('*')
      .order('id', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async read_all(
    page = 1,
    limit = 30,
    filter?: string,
    sortBy?: string,
    sortDir: 'asc' | 'desc' = 'desc',
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    let query = this.supabase.client.from(this.table).select('*', { count: 'exact' });
  
    if (filter) {
      query = query.ilike('name', `%${filter}%`);
    }
  
    const columns = ['id', 'name', 'terms'];
    if (sortBy && columns.includes(sortBy))
      query = query.order(sortBy, { ascending: sortDir === 'asc' });
    else
      query = query.order('id', { ascending: false });

    query = query.range(from, to);
    const { data, error, count } = await query;
  
    if (error) 
      throw new InternalServerErrorException(error.message);
  
    return {
      data,
      meta: { 
        page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) 
      },
    };
  }
  
  async read_one(id: number) {
    const { data, error } = await this.supabase.client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: number, dto: UpdateCustomerDto) {
    console.log(id);
    const { data, error } = await this.supabase.client
      .from(this.table)
      .update(dto)
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);
    return data?.[0] ?? null;
  }

  async delete(id: number) {
    const { data, error } = await this.supabase.client
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return data?.[0] ?? null;
  }
}
