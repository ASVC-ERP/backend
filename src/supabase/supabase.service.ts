import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    if (!url || !key) {
      throw new Error('Supabase URL or KEY is missing!');
    }

    this.supabase = createClient(url, key);
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  async connection_test() {
    try {
        const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .limit(1);

        if (error) throw error;

        return {
        success: true,
        message: 'Supabase connection works!',
        data,
        };
    } catch (err) {
        return {
        success: false,
        message: 'Supabase connection failed',
        error: err instanceof Error ? err.message : err,
        };
    }
  }
}
