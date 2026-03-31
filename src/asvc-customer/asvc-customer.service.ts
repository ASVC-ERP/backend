import { Injectable, 
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
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

  async count () {
    const { count, error } = await this.supabase.client
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (error) throw new InternalServerErrorException('Failed to fetch customer count');
    return count;
  }

  async search(query: string, limit = 20) {
    const q = query?.trim();

    if (!q) {
      return [];
    }

    const { data, error } = await this.supabase.client
      .from('customers')
      .select(`
          *
      `)
      .or(`name.ilike.*${q}*,address.ilike.*${q}*`)
      .order('id', { ascending: true })
      .limit(limit);

    if (error) throw new NotFoundException('Customer not found');
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
    try {
      const { data: existingCustomer, error: fetchError } = await this.supabase.client
        .from(this.table)
        .select('id, name')
        .eq('id', id)
        .single();
  
      if (fetchError || !existingCustomer)
        throw new NotFoundException(`Customer with ID ${id} not found`);
  
      const { data, error } = await this.supabase.client
        .from(this.table)
        .delete()
        .eq('id', id)
        .select();
  
      if (error) {
        if (error.code === '23503')
          throw new BadRequestException(`Cannot delete ${existingCustomer.name} with ID ${id}. This customer has related records (orders, invoices, transactions, etc.)`);
        if (error.code === '42501')
          throw new ForbiddenException(`You do not have permission to delete customer with ID ${id}`);
        // Generic database error
        throw new InternalServerErrorException(`Failed to delete customer with ID ${id}: ${error.message}`);
      }
  
      return {
        deleted: true,
        message: `Customer "${existingCustomer.name}" (ID: ${id}) deleted successfully`,
        data: data?.[0] ?? null
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof InternalServerErrorException
      ) throw error;

      throw new InternalServerErrorException(`An unexpected error occurred while deleting customer with ID ${id}: ${error.message}`);
    }
  }
}
