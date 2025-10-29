import { Module, Global } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * Feature Flags Module
 *
 * Global module that provides feature flag service to all modules.
 * Imported in AppModule.
 */
@Global()
@Module({
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
