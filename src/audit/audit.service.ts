import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface AuditEntry {
  action: string; // e.g. 'login.success', 'user.disable'
  actorId?: number | null;
  actorUsername?: string | null;
  targetType?: string | null;
  targetId?: string | number | null;
  summary?: string | null;
  meta?: Record<string, unknown> | null;
  ip?: string | null;
}

// Who did it / from where -- passed from controllers into services so the
// service layer can audit without knowing about HTTP.
export interface AuditCtx {
  actorId?: number | null;
  actorUsername?: string | null;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly supabase: SupabaseService) {}

  private readonly logger = new Logger(AuditService.name);
  private readonly table = 'audit_log';

  /**
   * Record one audit event. Best-effort: any failure is logged and
   * swallowed so an audit write can never break the request it records.
   */
  async record(entry: AuditEntry): Promise<void> {
    try {
      const { error } = await this.supabase.client.from(this.table).insert({
        actor_id: entry.actorId ?? null,
        actor_username: entry.actorUsername ?? null,
        action: entry.action,
        target_type: entry.targetType ?? null,
        target_id: entry.targetId != null ? String(entry.targetId) : null,
        summary: entry.summary ?? null,
        meta: entry.meta ?? null,
        ip: entry.ip ?? null,
      });
      if (error) {
        this.logger.warn(`audit ${entry.action}: ${error.message}`);
      }
    } catch (e) {
      this.logger.warn(`audit ${entry.action} threw: ${String(e)}`);
    }
  }
}
