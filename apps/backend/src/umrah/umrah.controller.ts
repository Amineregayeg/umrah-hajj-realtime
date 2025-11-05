import { Controller, Get, Query, Header } from '@nestjs/common';
import { UmrahService } from './umrah.service';

@Controller()
export class UmrahController {
  constructor(private readonly svc: UmrahService) {}

  @Get('umrah/steps')
  @Header('Cache-Control','public, max-age=86400')
  getSteps() {
    return this.svc.getSteps();
  }

  @Get('ritual/progress')
  @Header('Cache-Control','no-store')
  getProgress(@Query('userId') userId?: string) {
    return this.svc.getProgress(userId);
  }
}
