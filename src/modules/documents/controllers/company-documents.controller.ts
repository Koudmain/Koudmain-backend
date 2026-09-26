import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from '@/modules/documents/services/document.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { Document } from '@/modules/documents/models/document.model';
import { type RequestWithUser } from '@/common/types/request.type';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('document/company')
export class CompanyDocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly companiesService: CompaniesService,
  ) {}

  @ApiOperation({
    summary: "Récupérer les documents d'une entreprise",
    description:
      "Récupère la liste de tous les documents rattachés à une entreprise spécifique. L'utilisateur doit être membre ou propriétaire.",
  })
  @ApiParam({ name: 'companyId', description: "ID de l'entreprise", example: 1 })
  @ApiResponse({ status: 200, description: "Documents de l'entreprise récupérés." })
  @ApiResponse({ status: 400, description: "L'utilisateur n'a pas accès à cette entreprise." })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @HttpCode(HttpStatus.OK)
  @Get(':companyId')
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
}
