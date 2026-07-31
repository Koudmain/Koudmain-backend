import { IsEnum, IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory } from '@/modules/documents/models/document.model';
import { SignatureProvider } from '@/modules/documents/models/signature-envelope.model';

export class CreateDocumentDto {
  @ApiProperty({ description: "Nom d'affichage du document", example: "Carte d'identité Worker" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: "Nom d'origine du fichier", example: 'cni_jean_dupont.pdf' })
  @IsString()
  @IsOptional()
  originalFilename?: string;

  @ApiProperty({
    description: 'URL ou chemin du fichier sur le serveur / S3',
    example: 'https://s3.amazonaws.com/koudmain-docs/identity/cni_jean_dupont.pdf',
  })
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @ApiProperty({
    enum: DocumentCategory,
    description: 'Catégorie du document',
    example: DocumentCategory.OTHER,
  })
  @IsEnum(DocumentCategory)
  category: DocumentCategory;

  @ApiPropertyOptional({ description: 'Taille du fichier en octets', example: 1048576 })
  @IsNumber()
  @IsOptional()
  sizeBytes?: number;

  @ApiPropertyOptional({ description: 'Type MIME du fichier', example: 'application/pdf' })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'ID du profil worker à associer', example: 3 })
  @IsNumber()
  @IsOptional()
  workerId?: number;

  @ApiPropertyOptional({ description: "ID de l'entreprise à associer", example: 1 })
  @IsNumber()
  @IsOptional()
  companyId?: number;

  @ApiPropertyOptional({ description: "ID de l'utilisateur à associer", example: 1 })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({
    description: "Type d'assignation (IDENTITY, RIB, KBIS, DIPLOMA, etc.)",
    example: 'IDENTITY',
  })
  @IsString()
  @IsOptional()
  assignmentType?: string;

  @ApiPropertyOptional({ description: 'ID de la conversation liée', example: 5 })
  @IsNumber()
  @IsOptional()
  conversationId?: number;

  @ApiPropertyOptional({ description: 'ID de la mission liée', example: 10 })
  @IsNumber()
  @IsOptional()
  missionId?: number;

  @ApiPropertyOptional({ description: 'ID de la publication liée', example: 2 })
  @IsNumber()
  @IsOptional()
  publicationId?: number;

  @ApiPropertyOptional({
    description: 'Statut initial du contrat (si category = CONTRACT)',
    example: 'PENDING',
  })
  @IsString()
  @IsOptional()
  contractStatus?: string;

  @ApiPropertyOptional({
    description: 'Numéro de facture (si category = INVOICE)',
    example: 'INV-2026-001',
  })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Montant HT de la facture', example: 100 })
  @IsNumber()
  @IsOptional()
  amountHt?: number;

  @ApiPropertyOptional({ description: 'Montant TTC de la facture', example: 120 })
  @IsNumber()
  @IsOptional()
  amountTtc?: number;

  @ApiPropertyOptional({ description: 'Frais de la plateforme', example: 10 })
  @IsNumber()
  @IsOptional()
  feeAmount?: number;

  @ApiPropertyOptional({
    description: 'ID du document externe de signature',
    example: 'doc_12345',
  })
  @IsString()
  @IsOptional()
  externalDocumentId?: string;

  @ApiPropertyOptional({
    enum: SignatureProvider,
    description: 'Fournisseur de signature électronique',
    example: SignatureProvider.DOCUMENSO,
  })
  @IsEnum(SignatureProvider)
  @IsOptional()
  signatureProvider?: SignatureProvider;
}
