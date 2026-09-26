import { Controller, Get, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from '@/modules/documents/services/document.service';
import { Document } from '@/modules/documents/models/document.model';
import { type RequestWithUser } from '@/common/types/request.type';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('document/user')
export class UserDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @ApiOperation({
    summary: 'Récupérer ses documents personnels',
    description:
      "Récupère la liste de tous les documents rattachés au compte de l'utilisateur connecté.",
  })
  @ApiResponse({ status: 200, description: 'Documents personnels récupérés.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @HttpCode(HttpStatus.OK)
  @Get('me')
  async getDocumentsByUserId(@Request() req: RequestWithUser): Promise<Document[]> {
    const userId = req.user.sub;
    return this.documentsService.getByUserId(userId);
  }
}
