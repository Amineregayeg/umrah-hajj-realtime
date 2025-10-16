import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { VoiceTokenService } from './services/voice-token.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'fallback-secret-for-development'),
        signOptions: { 
          algorithm: 'HS256',
          issuer: 'umrah-hajj-backend',
          audience: 'umrah-hajj-voice-api',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AIController],
  providers: [AIService, VoiceTokenService],
  exports: [AIService, VoiceTokenService],
})
export class AIModule {}