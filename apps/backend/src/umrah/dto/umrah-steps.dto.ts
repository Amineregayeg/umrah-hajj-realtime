import { ApiProperty } from '@nestjs/swagger';

export class UmrahStepDto {
  @ApiProperty({ example: 'ihram' })
  id: string;

  @ApiProperty({ example: 'Ihram (State of Purity)' })
  name: string;

  @ApiProperty({ example: 'Enter the state of ritual purity' })
  description: string;

  @ApiProperty({ example: 1 })
  order: number;
}

export class UmrahStepsResponseDto {
  @ApiProperty({ type: [UmrahStepDto] })
  steps: UmrahStepDto[];
}
