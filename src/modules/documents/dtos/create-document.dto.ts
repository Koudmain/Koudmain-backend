import { IsEnum, IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { DocumentCategory } from '@/modules/documents/models/document.model';

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
  @IsNotEmpty()
  assignmentType: string;

  @IsNumber()
  @IsOptional()
  conversationId?: number;

  @IsNumber()
  @IsOptional()
  missionId?: number;

  @IsNumber()
  @IsOptional()
  publicationId?: number;
}
