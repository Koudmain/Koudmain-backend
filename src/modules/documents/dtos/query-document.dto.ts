import { IsEnum, IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory } from '@/modules/documents/models/document.model';

export class EntityDocumentsQueryDto {
  @ApiPropertyOptional({
    enum: DocumentCategory,
    description: 'Filtrer par catégorie (dossier S3)',
    example: DocumentCategory.IDENTITY,
  })
  @IsEnum(DocumentCategory)
  @IsOptional()
  category?: DocumentCategory;

  @ApiPropertyOptional({
    description: "Filtrer par type d'assignation précis (ex: PROOF_OF_ADDRESS, RIB, DIPLOMA, etc.)",
    example: 'PROOF_OF_ADDRESS',
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Recherche textuelle par nom de document' })
  @IsString()
  @IsOptional()
  search?: string;
}

export class QueryDocumentDto extends EntityDocumentsQueryDto {
  @ApiPropertyOptional({ description: 'Filtrer par ID worker' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  workerId?: number;

  @ApiPropertyOptional({ description: 'Filtrer par ID entreprise' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  companyId?: number;

  @ApiPropertyOptional({ description: 'Filtrer par ID utilisateur' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({ description: 'Filtrer par ID mission' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  missionId?: number;

  @ApiPropertyOptional({ description: 'Filtrer par ID conversation' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  conversationId?: number;

  @ApiPropertyOptional({ description: 'Filtrer par ID publication' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  publicationId?: number;
}
