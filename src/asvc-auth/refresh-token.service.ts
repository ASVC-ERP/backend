import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class RefreshTokenService {
  constructor(private readonly supabase: SupabaseService) {}

  private table = 'refresh_tokens';

  private newToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private expiry(): string {
    return new Date(Date.now() + TTL_MS).toISOString();
  }

  /** Issue a fresh refresh token for a user (used at login). Returns the raw token. */
  async issue(userId: number): Promise<string> {
    const token = this.newToken();
    const { error } = await this.supabase.client.from(this.table).insert({
      user_id: userId,
      token_hash: this.hash(token),
      expires_at: this.expiry(),
    });
    if (error) throw new Error(error.message);
    return token;
  }

  /**
   * Validate a presented refresh token and rotate it: the old row is revoked and
   * a new token is issued. Reuse of an already-revoked token revokes the whole
   * family (theft signal). Returns { userId, token } where token is the new raw token.
   */
  async rotate(presented: string): Promise<{ userId: number; token: string }> {
    const { data: row, error } = await this.supabase.client
      .from(this.table)
      .select('*')
      .eq('token_hash', this.hash(presented))
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new UnauthorizedException('Invalid refresh token');

    if (row.revoked_at) {
      await this.revokeAllForUser(row.user_id);
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Atomically claim the old row so concurrent rotations can't both succeed.
    const { data: claimed, error: claimErr } = await this.supabase.client
      .from(this.table)
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('revoked_at', null)
      .select('id');
    if (claimErr) throw new Error(claimErr.message);
    if (!claimed || claimed.length === 0) {
      throw new UnauthorizedException('Refresh token already used');
    }

    const token = this.newToken();
    const { data: created, error: insErr } = await this.supabase.client
      .from(this.table)
      .insert({
        user_id: row.user_id,
        token_hash: this.hash(token),
        expires_at: this.expiry(),
      })
      .select('id')
      .single();
    if (insErr) throw new Error(insErr.message);

    await this.supabase.client
      .from(this.table)
      .update({ replaced_by_id: created.id })
      .eq('id', row.id);

    return { userId: row.user_id, token };
  }

  /** Revoke a single token (used at logout). No-op if it does not exist. */
  async revoke(presented: string): Promise<void> {
    await this.supabase.client
      .from(this.table)
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', this.hash(presented))
      .is('revoked_at', null);
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.supabase.client
      .from(this.table)
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null);
  }
}
