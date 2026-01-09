import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly service: SupabaseService) {}

  async create(dto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const { data, error } = await this.service.client
      .from('users')
      .insert([{ ...dto, password: hashedPassword }])
      .select();

    if (error) throw new Error(error.message);
    return data[0];
  }

  async read() {
    const { data, error } = await this.service.client
      .from('users')
      .select('*');

    if (error) throw new Error(error.message);
    return data;
  }

  async read_one(id: number) {
    const { data, error } = await this.service.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: number, dto: UpdateUserDto) {
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }
    const { data, error } = await this.service.client
      .from('users')
      .update(dto)
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);
    return data[0];
  }

  async delete(id: number) {
    const { error } = await this.service.client
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { deleted: true };
  }
}
