import { ApiProperty } from '@nestjs/swagger';

export class RitualProgressDto {
  @ApiProperty({ example: 'active', description: 'Session state: active, paused, completed, abandoned' })
  sessionState: string;

  @ApiProperty({ example: 'tawaf', description: 'Current step: ihram, tawaf, sai, halq' })
  currentStep: string;

  @ApiProperty({ example: 3, description: 'Number of Tawaf laps completed (0-7)' })
  tawafLaps: number;

  @ApiProperty({ example: 0, description: 'Number of Sa\'i laps completed (0-7)' })
  saiLaps: number;

  @ApiProperty({ example: null, nullable: true, description: 'Completion timestamp if ritual is finished' })
  completedAt: Date | null;

  @ApiProperty({ example: '2025-11-05T16:00:00Z', description: 'Session start timestamp' })
  startedAt: Date;
}
