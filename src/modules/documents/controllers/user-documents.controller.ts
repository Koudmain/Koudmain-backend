import { Controller, Get, HttpCode, HttpStatus, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from '@/modules/documents/services/document.service';
import { Document } from '@/modules/documents/models/document.model';
import { EntityDocumentsQueryDto } from '@/modules/documents/dtos/query-document.dto';
import { type RequestWithUser } from '@/common/types/request.type';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('document/user')
export class UserDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @ApiOperation({
    summary: 'Récupérer ses documents personnels',
    description:
      "Récupère la liste de tous les documents rattachés au compte de l'utilisateur connecté. Possibilité de filtrer par catégorie (dossier S3), type d'assignation ou nom.",
  })
  @ApiResponse({ status: 200, description: 'Documents personnels récupérés.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @HttpCode(HttpStatus.OK)
  @Get('me')
  async getDocumentsByUserId(
    @Request() req: RequestWithUser,
    @Query() query: EntityDocumentsQueryDto = {},
  ): Promise<Document[]> {
    const userId = req.user.sub;
    return this.documentsService.findAll(userId, { ...query, userId });
  }
}
