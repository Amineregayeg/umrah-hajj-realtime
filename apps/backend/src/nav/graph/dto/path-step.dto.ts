import { ApiProperty } from '@nestjs/swagger';

export class PathStepDto {
  @ApiProperty({
    example: 'walk',
    enum: ['walk', 'stairs', 'elevator', 'escalator'],
    description: 'Type of movement for this step'
  })
  type: 'walk' | 'stairs' | 'elevator' | 'escalator';

  @ApiProperty({
    example: 'Walk 50m northeast toward Gate B',
    description: 'Human-readable turn-by-turn instruction'
  })
  instruction: string;

  @ApiProperty({ example: 'gate_a', description: 'Starting node ID for this step' })
  from: string;

  @ApiProperty({ example: 'node_x', description: 'Ending node ID for this step' })
  to: string;

  @ApiProperty({ example: 50, description: 'Distance of this step in meters' })
  distance_m: number;

  @ApiProperty({ example: 85, description: 'Remaining distance to destination in meters' })
  remaining_distance_m: number;

  @ApiProperty({
    example: 'ground',
    required: false,
    description: 'Floor identifier if floor change occurs'
  })
  floor?: string;
}
