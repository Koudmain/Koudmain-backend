import { IsEnum, IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentCategory } from '@/modules/documents/models/document.model';

export class QueryDocumentDto {
  @IsEnum(DocumentCategory)
  @IsOptional()
  category?: DocumentCategory;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  workerId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  companyId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  userId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  missionId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  conversationId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  publicationId?: number;

  @IsString()
  @IsOptional()
  search?: string;
}
