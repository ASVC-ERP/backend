import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private table = 'customers';

  async create(dto: CreateCustomerDto) {
    const { data, error } = await this.supabaseService.client
      .from(this.table)
      .insert([{ ...dto }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async read() {
    const { data, error } = await this.supabaseService.client
      .from(this.table)
      .select('*')
      .order('id', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async read_one(id: number) {
    const { data, error } = await this.supabaseService.client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: number, dto: UpdateCustomerDto) {
    console.log(id);
    const { data, error } = await this.supabaseService.client
      .from(this.table)
      .update(dto)
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);
    return data?.[0] ?? null;
  }

  async delete(id: number) {
    const { data, error } = await this.supabaseService.client
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return data?.[0] ?? null;
  }
}
