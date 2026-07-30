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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
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

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('document')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly workersService: WorkersService,
    private readonly companiesService: CompaniesService,
  ) {}

  @ApiOperation({
    summary: 'Créer un nouveau document',
    description:
      'Crée un nouveau document en base de données et rattache automatiquement ses associations (Worker, Company, User) ainsi que son contexte.',
  })
  @ApiResponse({ status: 201, description: 'Document créé avec succès.' })
  @ApiResponse({ status: 400, description: 'Erreur de validation des données transmises.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@Body() createDto: CreateDocumentDto): Promise<Document> {
    return this.documentsService.create(createDto);
  }

  @ApiOperation({
    summary: 'Récupérer la liste des documents',
    description:
      'Récupère la liste globale des documents enregistrés avec possibilité de filtrer par catégorie, recherche, worker, entreprise, user ou mission.',
  })
  @ApiResponse({ status: 200, description: 'Liste des documents récupérée.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @HttpCode(HttpStatus.OK)
  @Get()
  async findAll(@Query() query: QueryDocumentDto): Promise<Document[]> {
    return this.documentsService.findAll(query);
  }

  @ApiOperation({
    summary: "Récupérer les documents de l'utilisateur connecté",
    description: "Récupère la liste des documents rattachés à l'utilisateur actuellement connecté.",
  })
  @ApiResponse({ status: 200, description: 'Liste des documents de utilisateur récupérée.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @HttpCode(HttpStatus.OK)
  @Get('user/me')
  async getDocumentsByUserId(@Request() req: RequestWithUser): Promise<Document[]> {
    const userId = req.user.sub;
    return this.documentsService.getByUserId(userId);
  }

  @ApiOperation({
    summary: 'Récupérer les documents du travailleur connecté',
    description:
      'Récupère la liste des documents rattachés au profil de travailleur de utilisateur actuellement connecté.',
  })
  @ApiResponse({ status: 200, description: 'Liste des documents du travailleur récupérée.' })
  @ApiResponse({
    status: 400,
    description: 'Profil de travailleur non trouvé pour cet utilisateur.',
  })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
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

  @ApiOperation({
    summary: "Récupérer les documents d'une entreprise",
    description:
      'Récupère la liste des documents rattachés à une entreprise spécifique si utilisateur a les droits.',
  })
  @ApiParam({ name: 'companyId', description: "ID de l'entreprise", example: 1 })
  @ApiResponse({ status: 200, description: "Documents de l'entreprise récupérés." })
  @ApiResponse({
    status: 400,
    description: "Vous n'avez pas les droits pour accéder à cette entreprise.",
  })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
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

  @ApiOperation({
    summary: "Récupérer les documents d'une mission",
    description: 'Récupère la liste des documents rattachés à une mission spécifique.',
  })
  @ApiParam({ name: 'missionId', description: 'ID de la mission', example: 10 })
  @ApiResponse({ status: 200, description: 'Documents de la mission récupérés.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @HttpCode(HttpStatus.OK)
  @Get('mission/:missionId')
  async getDocumentsByMissionId(
    @Param('missionId', ParseIntPipe) missionId: number,
  ): Promise<Document[]> {
    return this.documentsService.getByMissionId(missionId);
  }

  @ApiOperation({
    summary: 'Récupérer un document par son ID',
    description: "Récupère les détails complets d'un document spécifique.",
  })
  @ApiParam({ name: 'id', description: 'ID du document', example: 5 })
  @ApiResponse({ status: 200, description: 'Détails du document récupérés.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number): Promise<Document> {
    const document = await this.documentsService.getById(id);
    if (!document) {
      throw new NotFoundException(`Document #${id} non trouvé`);
    }
    return document;
  }

  @ApiOperation({
    summary: 'Mettre à jour un document',
    description: "Met à jour les informations d'un document existant.",
  })
  @ApiParam({ name: 'id', description: 'ID du document', example: 5 })
  @ApiResponse({ status: 200, description: 'Document mis à jour avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  @HttpCode(HttpStatus.OK)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDocumentDto,
  ): Promise<Document> {
    return this.documentsService.update(id, updateDto);
  }

  @ApiOperation({
    summary: 'Supprimer un document',
    description:
      'Supprime définitivement un document ainsi que toutes ses associations en cascade.',
  })
  @ApiParam({ name: 'id', description: 'ID du document', example: 5 })
  @ApiResponse({ status: 200, description: 'Document supprimé avec succès.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<{ message: string; id: number }> {
    return this.documentsService.delete(id);
  }
}
