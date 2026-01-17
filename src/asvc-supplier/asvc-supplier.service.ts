import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateSupplierDto) {
    const { data, error } = await this.supabase.client
      .from('supplier')
      .insert(dto)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async read() {
    const { data, error } = await this.supabase.client
      .from('supplier')
      .select('*')
      .order('sid', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }

  async read_one(id: string) {
    const { data, error } = await this.supabase.client
      .from('supplier')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const { data, error } = await this.supabase.client
      .from('supplier')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async delete(id: string) {
    const { error } = await this.supabase.client
      .from('supplier')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true };
  }
}
