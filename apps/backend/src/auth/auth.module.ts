import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseJwtGuard } from './guards/supabase-jwt.guard';

@Module({
  imports: [ConfigModule],
  providers: [SupabaseJwtGuard],
  exports: [SupabaseJwtGuard],
})
export class AuthModule {}