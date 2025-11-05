import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UmrahService } from './umrah.service';
import { UmrahStepsResponseDto } from './dto/umrah-steps.dto';
import { RitualProgressDto } from './dto/ritual-progress.dto';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';

@ApiTags('Umrah')
@Controller()
export class UmrahController {
  constructor(private readonly umrahService: UmrahService) {}

  @Get('umrah/steps')
  @ApiOperation({
    summary: 'Get ordered Umrah ritual steps',
    description: 'Returns the canonical sequence of Umrah steps: Ihram → Tawaf → Sa\'i → Halq/Taqsir'
  })
  @ApiResponse({
    status: 200,
    description: 'Ordered list of Umrah steps',
    type: UmrahStepsResponseDto
  })
  async getSteps(): Promise<UmrahStepsResponseDto> {
    return this.umrahService.getSteps();
  }

  @Get('ritual/progress')
  @ApiOperation({
    summary: 'Get current ritual progress for authenticated user',
    description: 'Returns progress tracking for active Umrah session (laps completed, current step)'
  })
  @ApiResponse({
    status: 200,
    description: 'Current ritual progress',
    type: RitualProgressDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required'
  })
  @ApiBearerAuth()
  @UseGuards(SupabaseJwtGuard)
  async getProgress(@Request() req: any): Promise<RitualProgressDto> {
    const userId = req.user?.sub;
    return this.umrahService.getProgress(userId);
  }
}
