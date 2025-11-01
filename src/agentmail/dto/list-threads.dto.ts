import { IsOptional, IsNumber, IsString, IsBoolean, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class ListThreadsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  pageToken?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @IsString()
  after?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  ascending?: boolean;
}
