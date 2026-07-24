import { IsEnum, IsString, IsOptional, IsNumber, IsBoolean, IsDateString } from 'class-validator';
import { DocumentCategory } from '@/modules/documents/models/document.model';
import {
  SignatureStatus,
  SignatureProvider,
} from '@/modules/documents/models/signature-envelope.model';

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  originalFilename?: string;

  @IsString()
  @IsOptional()
  filePath?: string;

  @IsEnum(DocumentCategory)
  @IsOptional()
  category?: DocumentCategory;

  @IsNumber()
  @IsOptional()
  sizeBytes?: number;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsBoolean()
  @IsOptional()
  verified?: boolean;

  @IsString()
  @IsOptional()
  contractStatus?: string;

  @IsDateString()
  @IsOptional()
  signedAt?: Date;

  @IsString()
  @IsOptional()
  workerSignatureId?: string;

  @IsString()
  @IsOptional()
  employerSignatureId?: string;

  @IsString()
  @IsOptional()
  invoiceStatus?: string;

  @IsNumber()
  @IsOptional()
  amountHt?: number;

  @IsNumber()
  @IsOptional()
  amountTtc?: number;

  @IsNumber()
  @IsOptional()
  feeAmount?: number;

  @IsEnum(SignatureStatus)
  @IsOptional()
  signatureStatus?: SignatureStatus;

  @IsEnum(SignatureProvider)
  @IsOptional()
  signatureProvider?: SignatureProvider;

  @IsString()
  @IsOptional()
  externalDocumentId?: string;
}
