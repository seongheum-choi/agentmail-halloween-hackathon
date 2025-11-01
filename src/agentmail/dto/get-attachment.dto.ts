import { IsNotEmpty, IsString } from 'class-validator';

export class GetAttachmentDto {
  @IsNotEmpty()
  @IsString()
  threadId: string;

  @IsNotEmpty()
  @IsString()
  attachmentId: string;
}
