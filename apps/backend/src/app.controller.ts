import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AppService } from './app.service';
import { SupabaseJwtGuard } from './auth/guards/supabase-jwt.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('protected')
  @UseGuards(SupabaseJwtGuard)
  getProtected(@Request() req: any) {
    return {
      message: 'This is a protected endpoint',
      user: req.user,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ready',
        websocket: 'ready',
        auth: 'ready',
      },
    };
  }
}
