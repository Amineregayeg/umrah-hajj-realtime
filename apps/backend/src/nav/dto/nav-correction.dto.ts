import { IsNumber, IsString, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class DeltaDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export class NavCorrectionDto {
  @IsNumber()
  ts: number;

  @IsNumber()
  seq: number;

  @ValidateNested()
  @Type(() => DeltaDto)
  delta: DeltaDto;

  @IsString()
  @IsIn(['path', 'zone', 'node'])
  snapTo: 'path' | 'zone' | 'node';

  @IsNumber()
  confidence: number;
}