import { IsNumber, IsString, IsOptional, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class PositionDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lon: number;

  @IsNumber()
  alt: number;

  @IsNumber()
  floor: number;

  @IsNumber()
  acc: number;
}

export class NavUpdateDto {
  @IsNumber()
  ts: number;

  @IsNumber()
  seq: number;

  @IsString()
  userId: string;

  @ValidateNested()
  @Type(() => PositionDto)
  pos: PositionDto;

  @IsNumber()
  heading: number;

  @IsNumber()
  speed: number;

  @IsString()
  @IsIn(['gnss', 'imu', 'arcore', 'ble'])
  source: 'gnss' | 'imu' | 'arcore' | 'ble';

  @IsString()
  stage: string;

  @IsNumber()
  lap: number;

  @IsOptional()
  @IsNumber()
  sai_leg?: number;

  @IsNumber()
  confidence: number;

  @IsString()
  @IsIn(['guide', 'respond', 'mute'])
  mode: 'guide' | 'respond' | 'mute';

  @IsString()
  @IsIn(['android', 'ios'])
  device: 'android' | 'ios';
}