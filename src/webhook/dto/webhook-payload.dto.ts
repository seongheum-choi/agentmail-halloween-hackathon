import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;
}

class AttachmentDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  content_type: string;

  @IsString()
  @IsNotEmpty()
  content_id: string;

  @IsOptional()
  @IsString()
  url?: string;
}

class MessageDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  thread_id: string;

  @ValidateNested()
  @Type(() => AddressDto)
  from: AddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  to: AddressDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  cc?: AddressDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  bcc?: AddressDto[];

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsString()
  @IsNotEmpty()
  received_at: string;
}

export class WebhookPayloadDto {
  @IsString()
  @IsNotEmpty()
  event_type: string;

  @ValidateNested()
  @Type(() => MessageDto)
  message: MessageDto;
}
