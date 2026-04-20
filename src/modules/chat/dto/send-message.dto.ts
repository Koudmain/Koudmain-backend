import { IsNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsNumber()
  @IsNotEmpty()
  declare conversationId: number;

  @IsString()
  @IsNotEmpty()
  declare content: string;

  @IsString()
  @IsOptional()
  type?: string;
}