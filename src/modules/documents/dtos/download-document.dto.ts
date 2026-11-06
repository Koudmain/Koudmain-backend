import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class DownloadDocumentQueryDto {
  @ApiPropertyOptional({
    description: 'Afficher le fichier dans le navigateur plutôt que le télécharger',
    example: true,
  })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  inline?: boolean;

  @ApiPropertyOptional({ description: 'Version précise du fichier (contrats uniquement)' })
  @IsString()
  @IsOptional()
  versionId?: string;
}
