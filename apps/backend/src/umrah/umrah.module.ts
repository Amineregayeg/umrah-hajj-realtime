import { Module } from '@nestjs/common';
import { UmrahController } from './umrah.controller';
import { UmrahService } from './umrah.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UmrahController],
  providers: [UmrahService],
  exports: [UmrahService],
})
export class UmrahModule {}
