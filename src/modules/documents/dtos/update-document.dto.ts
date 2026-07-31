import { IsEnum, IsString, IsOptional, IsNumber, IsBoolean, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory } from '@/modules/documents/models/document.model';
import {
  SignatureStatus,
  SignatureProvider,
} from '@/modules/documents/models/signature-envelope.model';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: "Nouveau nom d'affichage" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "Nouveau nom de fichier d'origine" })
  @IsString()
  @IsOptional()
  originalFilename?: string;

  @ApiPropertyOptional({ description: 'Nouveau chemin de stockage' })
  @IsString()
  @IsOptional()
  filePath?: string;

  @ApiPropertyOptional({ enum: DocumentCategory, description: 'Nouvelle catégorie' })
  @IsEnum(DocumentCategory)
  @IsOptional()
  category?: DocumentCategory;

  @ApiPropertyOptional({ description: 'Nouvelle taille en octets' })
  @IsNumber()
  @IsOptional()
  sizeBytes?: number;

  @ApiPropertyOptional({ description: 'Nouveau type MIME' })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Valider ou rejeter la vérification des assignations' })
  @IsBoolean()
  @IsOptional()
  verified?: boolean;

  @ApiPropertyOptional({ description: 'Nouveau statut de contrat' })
  @IsString()
  @IsOptional()
  contractStatus?: string;

  @ApiPropertyOptional({ description: 'Horodatage de signature du contrat' })
  @IsDateString()
  @IsOptional()
  signedAt?: Date;

  @ApiPropertyOptional({ description: 'ID de signature worker' })
  @IsString()
  @IsOptional()
  workerSignatureId?: string;

  @ApiPropertyOptional({ description: 'ID de signature employeur' })
  @IsString()
  @IsOptional()
  employerSignatureId?: string;

  @ApiPropertyOptional({ description: 'Nouveau statut de facture' })
  @IsString()
  @IsOptional()
  invoiceStatus?: string;

  @ApiPropertyOptional({ description: 'Montant HT mis à jour' })
  @IsNumber()
  @IsOptional()
  amountHt?: number;

  @ApiPropertyOptional({ description: 'Montant TTC mis à jour' })
  @IsNumber()
  @IsOptional()
  amountTtc?: number;

  @ApiPropertyOptional({ description: 'Frais mis à jour' })
  @IsNumber()
  @IsOptional()
  feeAmount?: number;

  @ApiPropertyOptional({ enum: SignatureStatus, description: "Statut de l'enveloppe de signature" })
  @IsEnum(SignatureStatus)
  @IsOptional()
  signatureStatus?: SignatureStatus;

  @ApiPropertyOptional({ enum: SignatureProvider, description: 'Prestataire de signature' })
  @IsEnum(SignatureProvider)
  @IsOptional()
  signatureProvider?: SignatureProvider;

  @ApiPropertyOptional({ description: 'ID du document externe de signature' })
  @IsString()
  @IsOptional()
  externalDocumentId?: string;
}
