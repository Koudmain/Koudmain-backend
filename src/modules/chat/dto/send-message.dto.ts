import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 5, description: 'ID de la conversation' })
  @IsInt()
  declare conversationId: number;

  @ApiProperty({
    example: 'Bonjour, je suis disponible pour la mission.',
    description: 'Contenu du message',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  declare content: string;
}
