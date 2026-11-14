import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from '@/modules/documents/services/document.service';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { Document } from '@/modules/documents/models/document.model';
import { EntityDocumentsQueryDto } from '@/modules/documents/dtos/query-document.dto';
import { type RequestWithUser } from '@/common/types/request.type';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('document/worker')
export class WorkerDocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly workersService: WorkersService,
  ) {}

  @ApiOperation({
    summary: 'Récupérer ses documents worker',
    description:
      "Récupère la liste de tous les documents rattachés au profil Worker de l'utilisateur connecté (RIB, diplômes, certifications, etc.). Possibilité de filtrer par catégorie (dossier S3), type d'assignation ou nom.",
  })
  @ApiResponse({ status: 200, description: 'Documents worker récupérés.' })
  @ApiResponse({ status: 400, description: 'Aucun profil worker associé à cet utilisateur.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @HttpCode(HttpStatus.OK)
  @Get('me')
  async getDocumentsByWorkerId(
    @Request() req: RequestWithUser,
    @Query() query: EntityDocumentsQueryDto = {},
  ): Promise<Document[]> {
    const userId = req.user.sub;
    const workerProfile = await this.workersService.getWorkerByUserId(userId);
    if (!workerProfile) {
      throw new BadRequestException('Profil de travailleur non trouvé pour cet utilisateur');
    }
    return this.documentsService.findAll(userId, { ...query, workerId: workerProfile.id });
  }
}
