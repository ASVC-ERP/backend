import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    if (!url || !key) {
      throw new Error('Supabase URL or KEY is missing!');
    }

    this.supabase = createClient(url, key);
    this.logger.log('Supabase client initialized');
  }

  get client(): SupabaseClient {
    return this.supabase;
  }
}
