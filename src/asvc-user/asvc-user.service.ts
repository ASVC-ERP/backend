import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

// Login lockout policy (#7). Referenced only here.
const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class UsersService {
  constructor(private readonly service: SupabaseService) {}

  private readonly logger = new Logger(UsersService.name);
  private table = 'users';

  // Strip internal fields before a user object leaves the service.
  private sanitize<T extends Record<string, unknown>>(user: T | null) {
    if (!user) return user;
    const { password, failed_login_attempts, ...safe } = user;
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

    // Build the DB patch from the DTO. `unlock` is an admin action, not a
    // column: consume it, then drop it before it reaches Supabase.
    const patch: Record<string, unknown> = { ...dto };
    delete patch.unlock;
    if (dto.unlock) {
      patch.failed_login_attempts = 0;
      patch.locked_until = null;
    }
    if (typeof patch.password === 'string') {
      patch.password = await bcrypt.hash(patch.password, 10);
    }

    const { data, error } = await this.service.client
      .from(this.table)
      .update(patch)
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

  // Called from AuthService on a wrong-password attempt. Best-effort:
  // a failure here must never turn a valid login into a rejected one, so
  // errors are logged and swallowed.
  async registerFailedLogin(userId: number, currentAttempts: number) {
    const next = currentAttempts + 1;
    const lock = next >= MAX_FAILED_LOGINS;
    const patch = lock
      ? {
          failed_login_attempts: 0,
          locked_until: new Date(Date.now() + LOCK_DURATION_MS).toISOString(),
        }
      : { failed_login_attempts: next };
    try {
      const { error } = await this.service.client
        .from(this.table)
        .update(patch)
        .eq('id', userId);
      if (error) this.logger.warn(`registerFailedLogin: ${error.message}`);
    } catch (e) {
      this.logger.warn(`registerFailedLogin threw: ${String(e)}`);
    }
  }

  // Called from AuthService after a successful login. Best-effort, same reasoning.
  async clearLoginFailures(userId: number) {
    try {
      const { error } = await this.service.client
        .from(this.table)
        .update({ failed_login_attempts: 0, locked_until: null })
        .eq('id', userId);
      if (error) this.logger.warn(`clearLoginFailures: ${error.message}`);
    } catch (e) {
      this.logger.warn(`clearLoginFailures threw: ${String(e)}`);
    }
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
