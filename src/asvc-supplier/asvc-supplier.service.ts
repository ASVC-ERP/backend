import { Injectable, 
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException
} from '@nestjs/common';
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

  async find_by_page(
    page = 1, 
    limit = 100,
    search?: string,
  ) {
    limit = Math.min(limit, 1000);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log({ page, limit, from, to, search });

    let query = this.supabase.client
      .from(this.table)
      .select('*', { count: 'exact' })
      .order('id', { ascending: false });

    if (search) {
      query = query.or(`sid.ilike.%${search}%,name.ilike.%${search}%`);
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

  async count() {
    const { count, error } = await this.supabase.client
      .from(this.table)
      .select('*', { count: 'exact', head: true });

    if (error) throw new InternalServerErrorException("Cannot get supplier count");
    return count;
  }

  async search(query: string, limit = 20) {
    const q = query?.trim();

    if (!q) {
      return [];
    }

    const { data, error } = await this.supabase.client
      .from(this.table)
      .select(`
          *
      `)
      .ilike('name', `%${q}%`)
      .order('id', { ascending: false })
      .limit(limit);

    if (error) throw new NotFoundException('Cannot find ' + q);
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
    try {
      const { data: existingSupplier, error: fetchError } = await this.supabase.client
        .from(this.table)
        .select('id, name')
        .eq('id', id)
        .single();
  
      if (fetchError || !existingSupplier)
        throw new NotFoundException(`Supplier with ID ${id} not found`);
  
      const { error } = await this.supabase.client
        .from(this.table)
        .delete()
        .eq('id', id);
  
      if (error) {
        if (error.code === '23503')
          throw new BadRequestException(`Cannot delete ${existingSupplier.name} with ID: ${id}. This supplier has related records (products, purchase orders, transactions, etc.)`);
        if (error.code === '42501')
          throw new ForbiddenException(`You do not have permission to delete supplier with ID ${id}`);
        if (error.message.includes('violates'))
          throw new BadRequestException(`Cannot delete supplier with ID ${id}. Database constraint violation: ${error.message}`);
        // Generic database error
        throw new InternalServerErrorException(`Failed to delete supplier with ID ${id}: ${error.message}`);
      }
  
      return { 
        success: true,
        message: `Supplier "${existingSupplier.name}" (ID: ${id}) deleted successfully`
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof InternalServerErrorException
      ) throw error;

      throw new InternalServerErrorException(`An unexpected error occurred while deleting supplier with ID ${id}: ${error.message}`);
    }
  }
}
