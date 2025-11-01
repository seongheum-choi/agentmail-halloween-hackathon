import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  conversationHistory?: MessageDto[];
}
