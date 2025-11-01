import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CalendarQueryDto {
  @IsString()
  query: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsBoolean()
  @IsOptional()
  answer?: boolean;
}
