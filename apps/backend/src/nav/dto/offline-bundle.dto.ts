import { ApiProperty } from '@nestjs/swagger';

export class OfflineBundleDto {
  @ApiProperty({ example: '1.0.0', description: 'Bundle version for cache invalidation' })
  version: string;

  @ApiProperty({ description: 'Complete navigation graph structure' })
  graph: any;

  @ApiProperty({
    description: 'Common phrases for offline voice guidance',
    example: ['Turn left', 'Turn right', 'Take stairs', 'Take elevator']
  })
  phrases: string[];

  @ApiProperty({ example: 'metric', description: 'Unit system: metric or imperial' })
  units: string;

  @ApiProperty({ example: 1730825000000, description: 'Bundle generation timestamp' })
  timestamp: number;
}
