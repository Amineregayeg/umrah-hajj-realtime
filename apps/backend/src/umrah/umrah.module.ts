import { Module } from '@nestjs/common';
import { UmrahController } from './umrah.controller';
import { UmrahService } from './umrah.service';

@Module({
  controllers: [UmrahController],
  providers: [UmrahService],
  exports: [UmrahService],
})
export class UmrahModule {}
