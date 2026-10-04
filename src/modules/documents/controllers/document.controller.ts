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
  Request,
  ParseFilePipe,
  ParseIntPipe,
  MaxFileSizeValidator,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { DocumentDownload, DocumentsService } from '@/modules/documents/services/document.service';
import { Document } from '@/modules/documents/models/document.model';
import { CreateDocumentDto } from '@/modules/documents/dtos/create-document.dto';
import { UpdateDocumentDto } from '@/modules/documents/dtos/update-document.dto';
import { QueryDocumentDto } from '@/modules/documents/dtos/query-document.dto';
import { DownloadDocumentQueryDto } from '@/modules/documents/dtos/download-document.dto';
import { StoredVersion } from '@/modules/s3/s3.types';
import { type RequestWithUser } from '@/common/types/request.type';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const uploadedFilePipe = new ParseFilePipe({
  validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
});

const FILE_SCHEMA = {
  type: 'object',
  properties: { file: { type: 'string', format: 'binary', description: 'Fichier à stocker' } },
  required: ['file'],
};

export class PostDocumentResponseDto {
  declare message: string;
  declare id: number;
  declare createdAt: Date;
}

@ApiTags('Documents')
@ApiBearerAuth()
@ApiExtraModels(CreateDocumentDto)
@Controller('document')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @ApiOperation({
    summary: 'Créer un nouveau document',
    description:
      "Crée un document et stocke son fichier sur S3 (PDF, PNG ou JPEG). Un document personnel ne peut être rattaché qu'à soi, à son profil worker ou à ses entreprises. Un contrat ou une facture exige missionId et ne peut être déposé que par l'entreprise de la mission.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { allOf: [{ $ref: getSchemaPath(CreateDocumentDto) }, FILE_SCHEMA] } })
  @ApiResponse({ status: 201, description: 'Document créé avec succès.' })
  @ApiResponse({ status: 400, description: 'Fichier manquant ou données invalides.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @ApiResponse({ status: 403, description: 'Rattachement ou modification non autorisé.' })
  @ApiResponse({ status: 415, description: 'Format non accepté (PDF, PNG, JPEG).' })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Request() req: RequestWithUser,
    @Body() createDto: CreateDocumentDto,
    @UploadedFile(uploadedFilePipe) file: Express.Multer.File,
  ): Promise<Document> {
    return this.documentsService.create(req.user.sub, createDto, file);
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
  async findAll(
    @Request() req: RequestWithUser,
    @Query() query: QueryDocumentDto,
  ): Promise<Document[]> {
    return this.documentsService.findAll(req.user.sub, query);
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
    @Request() req: RequestWithUser,
    @Param('missionId', ParseIntPipe) missionId: number,
  ): Promise<Document[]> {
    return this.documentsService.findAll(req.user.sub, { missionId });
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
  async getById(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Document> {
    return this.documentsService.findOne(req.user.sub, id);
  }

  @ApiOperation({
    summary: "Obtenir un lien de téléchargement d'un document",
    description: 'Génère une URL S3 présignée, valable 15 minutes.',
  })
  @ApiParam({ name: 'id', description: 'ID du document', example: 5 })
  @ApiResponse({ status: 200, description: 'Lien de téléchargement généré.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @ApiResponse({ status: 404, description: 'Document, fichier ou version introuvable.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/download')
  async getDownloadUrl(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DownloadDocumentQueryDto,
  ): Promise<DocumentDownload> {
    return this.documentsService.getDownloadUrl(req.user.sub, id, query);
  }

  @ApiOperation({
    summary: "Lister les versions du fichier d'un document",
    description:
      'Liste les versions stockées sur S3, de la plus récente à la plus ancienne. Seuls les contrats conservent un historique.',
  })
  @ApiParam({ name: 'id', description: 'ID du document', example: 5 })
  @ApiResponse({ status: 200, description: 'Versions récupérées.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @ApiResponse({ status: 404, description: 'Document ou fichier introuvable.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/versions')
  async listFileVersions(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StoredVersion[]> {
    return this.documentsService.listFileVersions(req.user.sub, id);
  }

  @ApiOperation({
    summary: "Remplacer le fichier d'un document",
    description:
      "Envoie un nouveau fichier sur S3 et met à jour ses métadonnées. Réservé au propriétaire, ou à l'entreprise de la mission pour un contrat ou une facture en brouillon. Un contrat garde l'ancienne version dans son historique.",
  })
  @ApiParam({ name: 'id', description: 'ID du document', example: 5 })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: FILE_SCHEMA })
  @ApiResponse({ status: 200, description: 'Fichier remplacé.' })
  @ApiResponse({ status: 400, description: 'Fichier manquant ou invalide.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  @ApiResponse({ status: 403, description: 'Rattachement ou modification non autorisé.' })
  @ApiResponse({ status: 409, description: 'Contrat signé, facture émise ou contrat scellé.' })
  @ApiResponse({ status: 415, description: 'Format non accepté (PDF, PNG, JPEG).' })
  @HttpCode(HttpStatus.OK)
  @Put(':id/file')
  @UseInterceptors(FileInterceptor('file'))
  async replaceFile(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(uploadedFilePipe) file: Express.Multer.File,
  ): Promise<Document> {
    return this.documentsService.replaceFile(req.user.sub, id, file);
  }

  @ApiOperation({
    summary: 'Mettre à jour un document',
    description:
      "Renomme un document, ou modifie les montants d'une facture en brouillon. Réservé au propriétaire, ou à l'entreprise de la mission pour un contrat ou une facture.",
  })
  @ApiParam({ name: 'id', description: 'ID du document', example: 5 })
  @ApiResponse({ status: 200, description: 'Document mis à jour avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  @ApiResponse({ status: 403, description: 'Rattachement ou modification non autorisé.' })
  @ApiResponse({ status: 409, description: 'Contrat signé, facture émise ou contrat scellé.' })
  @HttpCode(HttpStatus.OK)
  @Patch(':id')
  async update(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDocumentDto,
  ): Promise<Document> {
    return this.documentsService.update(req.user.sub, id, updateDto);
  }

  @ApiOperation({
    summary: 'Supprimer un document',
    description:
      'Supprime définitivement un document, ses associations et son fichier sur S3. Réservé au propriétaire, ou aux parties de la mission pour un contrat ou une facture en brouillon.',
  })
  @ApiParam({ name: 'id', description: 'ID du document', example: 5 })
  @ApiResponse({ status: 200, description: 'Document supprimé avec succès.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  @ApiResponse({ status: 403, description: 'Rattachement ou modification non autorisé.' })
  @ApiResponse({ status: 409, description: 'Contrat signé, facture émise ou contrat scellé.' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async delete(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string; id: number }> {
    return this.documentsService.delete(req.user.sub, id);
  }
}
