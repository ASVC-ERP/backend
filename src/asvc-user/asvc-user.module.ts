import { Module } from '@nestjs/common';
import { UsersController } from './asvc-user.controller'
import { UsersService } from './asvc-user.service'
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    controllers: [UsersController],
    providers: [UsersService]
})
export class UsersModule {}
