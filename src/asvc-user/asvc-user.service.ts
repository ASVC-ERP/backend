import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly service: SupabaseService) {}

  private table = 'users';

  // Strip the password hash before a user object leaves the service.
  private sanitize<T extends { password?: unknown }>(user: T | null) {
    if (!user) return user;
    const { password, ...safe } = user;
    return safe;
  }

  async create(dto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const { data, error } = await this.service.client
      .from(this.table)
      .insert([{ ...dto, role: dto.role ?? 'agent', password: hashedPassword }])
      .select();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('Username already taken');
      }
      throw new Error(error.message);
    }
    return this.sanitize(data[0]);
  }

  async read() {
    const { data, error } = await this.service.client
      .from(this.table)
      .select('*');

    if (error) throw new Error(error.message);
    return data.map((user) => this.sanitize(user));
  }

  async read_one(id: number) {
    const { data, error } = await this.service.client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('User not found');
    return this.sanitize(data);
  }

  // Internal-only: keeps the password hash so AuthService can bcrypt.compare.
  async read_username(username: string) {
    const { data, error } = await this.service.client
      .from(this.table)
      .select('*')
      .eq('username', username)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return data;
  }

  async update(id: number, dto: UpdateUserDto) {
    const { data: current } = await this.service.client
      .from(this.table)
      .select('role')
      .eq('id', id)
      .maybeSingle();

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }
    const { data, error } = await this.service.client
      .from(this.table)
      .update(dto)
      .eq('id', id)
      .select();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('Username already taken');
      }
      throw new Error(error.message);
    }

    // Anything that changes who the user is, or shuts them off, ends live sessions.
    const roleChanged = dto.role != null && dto.role !== current?.role;
    if (dto.password != null || dto.active === false || roleChanged) {
      await this.revokeUserTokens(id);
    }

    return this.sanitize(data[0]);
  }

  private async revokeUserTokens(userId: number) {
    await this.service.client
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null);
  }

  async delete(id: number) {
    const { error } = await this.service.client
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { deleted: true };
  }
}
