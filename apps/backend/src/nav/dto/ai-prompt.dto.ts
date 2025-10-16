import { IsNumber, IsString, IsIn } from 'class-validator';

export class AiPromptDto {
  @IsNumber()
  ts: number;

  @IsString()
  text: string;

  @IsString()
  voice: string;

  @IsString()
  @IsIn(['high', 'medium', 'low'])
  priority: 'high' | 'medium' | 'low';

  @IsString()
  stage: string;
}