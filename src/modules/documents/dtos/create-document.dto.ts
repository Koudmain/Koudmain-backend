import { IsEnum, IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { DocumentCategory } from '@/modules/documents/models/document.model';
import { SignatureProvider } from '@/modules/documents/models/signature-envelope.model';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  originalFilename?: string;

  @IsString()
  @IsNotEmpty()
  filePath: string;

  @IsEnum(DocumentCategory)
  category: DocumentCategory;

  @IsNumber()
  @IsOptional()
  sizeBytes?: number;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsNumber()
  @IsOptional()
  workerId?: number;

  @IsNumber()
  @IsOptional()
  companyId?: number;

  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsString()
  @IsOptional()
  assignmentType?: string;

  @IsNumber()
  @IsOptional()
  conversationId?: number;

  @IsNumber()
  @IsOptional()
  missionId?: number;

  @IsNumber()
  @IsOptional()
  publicationId?: number;

  @IsString()
  @IsOptional()
  contractStatus?: string;
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsNumber()
  @IsOptional()
  amountHt?: number;

  @IsNumber()
  @IsOptional()
  amountTtc?: number;

  @IsNumber()
  @IsOptional()
  feeAmount?: number;

  @IsString()
  @IsOptional()
  externalDocumentId?: string;

  @IsEnum(SignatureProvider)
  @IsOptional()
  signatureProvider?: SignatureProvider;
}
