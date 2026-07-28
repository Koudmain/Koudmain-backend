import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jean', description: "Prénom de l'utilisateur" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  first_name?: string;

  @ApiPropertyOptional({ example: 'Dupont', description: "Nom de l'utilisateur" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  last_name?: string;
}
