import { IsEnum, IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DocumentCategory } from '@/modules/documents/models/document.model';

export class CreateDocumentDto {
  @ApiProperty({ description: "Nom d'affichage du document", example: "Carte d'identité Worker" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: DocumentCategory,
    description: 'Catégorie du document, qui détermine son dossier de stockage S3',
    example: DocumentCategory.IDENTITY,
  })
  @IsEnum(DocumentCategory)
  category: DocumentCategory;

  @ApiPropertyOptional({ description: 'ID du profil worker à associer', example: 3 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  workerId?: number;

  @ApiPropertyOptional({ description: "ID de l'entreprise à associer", example: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  companyId?: number;

  @ApiPropertyOptional({ description: "ID de l'utilisateur à associer", example: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({
    description: "Type d'assignation plus précis que la catégorie (par défaut : la catégorie)",
    example: 'PROOF_OF_ADDRESS',
  })
  @IsString()
  @IsOptional()
  assignmentType?: string;

  @ApiPropertyOptional({ description: 'ID de la conversation liée', example: 5 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  conversationId?: number;

  @ApiPropertyOptional({ description: 'ID de la mission liée', example: 10 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  missionId?: number;

  @ApiPropertyOptional({ description: 'ID de la publication liée', example: 2 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  publicationId?: number;

  @ApiPropertyOptional({
    description: 'Numéro de facture (si category = INVOICE)',
    example: 'INV-2026-001',
  })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Montant HT de la facture', example: 100 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  amountHt?: number;

  @ApiPropertyOptional({ description: 'Montant TTC de la facture', example: 120 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  amountTtc?: number;

  @ApiPropertyOptional({ description: 'Frais de la plateforme', example: 10 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  feeAmount?: number;
}
