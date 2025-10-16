import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProfileModule } from './profile/profile.module';
import { ConsentModule } from './consent/consent.module';
import { ContentModule } from './content/content.module';
import { QuranModule } from './quran/quran.module';
import { AIModule } from './ai/ai.module';
import { NavModule } from './nav/nav.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { SecurityModule } from './security/security.module';
import { SecurityInitService } from './shared/utils/security-init.util';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SecurityModule,
    PrismaModule,
    AuthModule,
    NavModule,
    ProfileModule,
    ConsentModule,
    ContentModule,
    QuranModule,
    AIModule,
    HealthModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService, SecurityInitService],
})
export class AppModule {}
