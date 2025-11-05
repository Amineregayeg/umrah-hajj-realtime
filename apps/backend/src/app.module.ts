import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
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
import { FeatureFlagsModule } from './shared/config/feature-flags.module';
import { UmrahModule } from './umrah/umrah.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),
    FeatureFlagsModule,
    SecurityModule,
    PrismaModule,
    AuthModule,
    NavModule,
    ProfileModule,
    ConsentModule,
    ContentModule,
    QuranModule,
    AIModule,
    UmrahModule,
    HealthModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService, SecurityInitService],
})
export class AppModule {}
