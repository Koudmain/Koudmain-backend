import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Param,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { DocumentsService } from '@/modules/documents/services/document.service';
import { Document } from '@/modules/documents/models/document.model';
import { CreateDocumentDto } from '@/modules/documents/dtos/create-document.dto';

export class PostDocumentResponseDto {
  declare message: string;
  declare id: number;
  declare createdAt: Date;
}

@Controller('document')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('create')
  async create(@Body() createDto: CreateDocumentDto): Promise<PostDocumentResponseDto> {
    const document: Document | null = await this.documentsService.create(createDto);

    if (!document) {
      throw new BadRequestException('Une erreur est survenue lors de la création du document');
    }

    const res: PostDocumentResponseDto = {
      message: 'Document créé avec succès',
      id: document.id,
      createdAt: document.createdAt,
    };

    return res;
  }

  @HttpCode(HttpStatus.OK)
  @Get('get')
  async get(): Promise<Document[]> {
    return this.documentsService.getAll();
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async getById(@Param('id') id: number): Promise<Document> {
    const document: Document | null = await this.documentsService.getById(id);

    if (!document) {
      throw new BadRequestException('Document non trouvé');
    }

    return document;
  }

  @HttpCode(HttpStatus.OK)
  @Delete('/delete/:id')
  async delete(@Param('id') id: number) {
    await this.documentsService.delete(id);

    const res = {
      message: 'Document supprimé avec succès',
    };

    return res;
  }
}
