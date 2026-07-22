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
  Request,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { DocumentsService } from '@/modules/documents/services/document.service';
import { Document } from '@/modules/documents/models/document.model';
import { CreateDocumentDto } from '@/modules/documents/dtos/create-document.dto';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

export class PostDocumentResponseDto {
  declare message: string;
  declare id: number;
  declare createdAt: Date;
}

@Controller('document')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly workersService: WorkersService,
    private readonly companiesService: CompaniesService,
  ) {}

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
  @Get('/')
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
  @Get('user')
  async getDocumentsByUserId(@Request() req: RequestWithUser): Promise<Document[]> {
    const userId = req.user.sub;

    return this.documentsService.getDocumentsByUserId(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('worker')
  async getDocumentsByWorkerId(@Request() req: RequestWithUser): Promise<Document[]> {
    const userId = req.user.sub;

    const workerProfile = await this.workersService.getWorkerByUserId(userId);
    if (!workerProfile) {
      throw new BadRequestException('Profil de travailleur non trouvé pour cet utilisateur');
    }

    return this.documentsService.getDocumentsByWorkerId(workerProfile.id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('company/:companyId')
  async getDocumentsByCompanyId(
    @Request() req: RequestWithUser,
    @Param('companyId') companyId: number,
  ): Promise<Document[]> {
    const userId = req.user.sub;

    const isInCompany = await this.companiesService.isUserInCompany(userId, companyId);
    if (!isInCompany) {
      throw new BadRequestException("Vous n'avez pas les droits pour accéder à cette entreprise");
    }

    return this.documentsService.getDocumentsByCompanyId(companyId);
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
