import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SupplierInvoiceService {
    constructor(private readonly supabase: SupabaseService) {}
      
}
