import { Module, Global } from '@nestjs/common';
import { SecurityConfigService } from './security-config.service';
import { LogRedactionService } from './log-redaction.service';
import { JwtRotationService } from './jwt-rotation.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    SecurityConfigService,
    LogRedactionService,
    JwtRotationService,
  ],
  exports: [
    SecurityConfigService,
    LogRedactionService,
    JwtRotationService,
  ],
})
export class SecurityModule {}