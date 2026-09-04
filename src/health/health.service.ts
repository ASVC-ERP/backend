import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class HealthService {
  constructor(private readonly supabase: SupabaseService) {}

  async check() {
    const base = {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'inventory-api',
    };

    // cheap round-trip to confirm the database is reachable
    const started = Date.now();
    const { error } = await this.supabase.client
      .from('users')
      .select('id', { head: true, count: 'exact' });

    if (error) {
      throw new ServiceUnavailableException({
        ...base,
        status: 'error',
        db: { up: false, message: error.message },
      });
    }

    return { ...base, db: { up: true, latencyMs: Date.now() - started } };
  }
}
