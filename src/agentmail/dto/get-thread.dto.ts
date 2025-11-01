import { IsNotEmpty, IsString } from 'class-validator';

export class GetThreadDto {
  @IsNotEmpty()
  @IsString()
  threadId: string;
}
