import { Module, OnModuleInit } from '@nestjs/common';
import { QuranController } from './quran.controller';
import { QuranService } from './quran.service';

@Module({
  controllers: [QuranController],
  providers: [QuranService],
  exports: [QuranService],
})
export class QuranModule implements OnModuleInit {
  constructor(private readonly quranService: QuranService) {}

  async onModuleInit() {
    // Initialize the service when the module loads
    await this.quranService.onModuleInit();
  }
}