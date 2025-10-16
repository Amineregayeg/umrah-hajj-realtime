import { IsString, IsIn } from 'class-validator';

export class UiBannerDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsString()
  @IsIn(['info', 'warning', 'error', 'success'])
  level: 'info' | 'warning' | 'error' | 'success';
}