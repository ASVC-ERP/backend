import { Injectable, BadRequestException} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(private readonly supabase: SupabaseService) {}

  private readonly table = 'suppliers';

  async create(dto: CreateSupplierDto) {
    const { data, error } = await this.supabase.client
      .from(this.table)
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException("Cannot add supplier");
    return data;
  }

  async read() {
    const { data, error } = await this.supabase.client
      .from(this.table)
      .select('*')
      .order('sid', { ascending: true });

    if (error) throw new BadRequestException("Cannot find supplier");
    return data;
  }

  async read_one(id: string) {
    const { data, error } = await this.supabase.client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new BadRequestException("Cannot find supplier");
    return data;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const { data, error } = await this.supabase.client
      .from(this.table)
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException("Cannot update supplier");
    return data;
  }

  async delete(id: string) {
    const { error } = await this.supabase.client
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException("Cannot delete supplier");
    return { success: true };
  }
}
