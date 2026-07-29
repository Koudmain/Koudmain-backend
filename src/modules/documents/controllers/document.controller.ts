import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  BadRequestException,
  NotFoundException,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { DocumentsService } from '@/modules/documents/services/document.service';
import { Document } from '@/modules/documents/models/document.model';
import { CreateDocumentDto } from '@/modules/documents/dtos/create-document.dto';
import { UpdateDocumentDto } from '@/modules/documents/dtos/update-document.dto';
import { QueryDocumentDto } from '@/modules/documents/dtos/query-document.dto';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { type RequestWithUser } from '@/common/types/request.type';

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

  // POST /document
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@Body() createDto: CreateDocumentDto): Promise<Document> {
    return this.documentsService.create(createDto);
  }

  // GET /document
  @HttpCode(HttpStatus.OK)
  @Get()
  async findAll(@Query() query: QueryDocumentDto): Promise<Document[]> {
    return this.documentsService.findAll(query);
  }

  // GET /document/user/me
  @HttpCode(HttpStatus.OK)
  @Get('user/me')
  async getDocumentsByUserId(@Request() req: RequestWithUser): Promise<Document[]> {
    const userId = req.user.sub;
    return this.documentsService.getByUserId(userId);
  }

  // GET /document/worker/me
  @HttpCode(HttpStatus.OK)
  @Get('worker/me')
  async getDocumentsByWorkerId(@Request() req: RequestWithUser): Promise<Document[]> {
    const userId = req.user.sub;
    const workerProfile = await this.workersService.getWorkerByUserId(userId);
    if (!workerProfile) {
      throw new BadRequestException('Profil de travailleur non trouvé pour cet utilisateur');
    }
    return this.documentsService.getByWorkerId(workerProfile.id);
  }

  // GET /document/company/:companyId
  @HttpCode(HttpStatus.OK)
  @Get('company/:companyId')
  async getDocumentsByCompanyId(
    @Request() req: RequestWithUser,
    @Param('companyId', ParseIntPipe) companyId: number,
  ): Promise<Document[]> {
    const userId = req.user.sub;
    const isInCompany = await this.companiesService.isUserInCompany(userId, companyId);
    if (!isInCompany) {
      throw new BadRequestException("Vous n'avez pas les droits pour accéder à cette entreprise");
    }
    return this.documentsService.getByCompanyId(companyId);
  }

  // GET /document/mission/:missionId
  @HttpCode(HttpStatus.OK)
  @Get('mission/:missionId')
  async getDocumentsByMissionId(
    @Param('missionId', ParseIntPipe) missionId: number,
  ): Promise<Document[]> {
    return this.documentsService.getByMissionId(missionId);
  }

  // GET /document/:id
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number): Promise<Document> {
    const document = await this.documentsService.getById(id);
    if (!document) {
      throw new NotFoundException(`Document #${id} non trouvé`);
    }
    return document;
  }

  // PATCH /document/:id
  @HttpCode(HttpStatus.OK)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDocumentDto,
  ): Promise<Document> {
    return this.documentsService.update(id, updateDto);
  }

  // DELETE /document/:id
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<{ message: string; id: number }> {
    return this.documentsService.delete(id);
  }
}
