import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApplicationService } from '../services/application.service';
import { ApplyDto } from '../dto/apply.dto';
import { UpdateApplicationStatusDto } from '../dto/update-application-status.dto';
import { currentUser } from '@/decorators/current-user.decorator';
import type { JwtPayload } from '@/decorators/current-user.decorator';

@ApiTags('Application')
@ApiBearerAuth()
@Controller('application')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Postuler à une offre',
    description:
      'Permet au travailleur connecté de postuler à une offre d’emploi avec un message optionnel.',
  })
  @ApiResponse({ status: 201, description: 'Candidature enregistrée avec succès.' })
  @ApiResponse({ status: 400, description: 'Offre expirée ou requête invalide.' })
  @ApiResponse({ status: 403, description: 'KYC requis non validé.' })
  @ApiResponse({ status: 404, description: 'Offre ou profil travailleur non trouvé.' })
  @ApiResponse({ status: 409, description: 'Candidature déjà existante pour cette offre.' })
  @Post('apply')
  async apply(@currentUser() user: JwtPayload, @Body() dto: ApplyDto) {
    if (!user?.sub) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    return this.applicationService.apply(Number(user.sub), dto);
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mes candidatures',
    description:
      'Récupère la liste de toutes les candidatures envoyées par le travailleur connecté.',
  })
  @ApiResponse({ status: 200, description: 'Liste des candidatures récupérée avec succès.' })
  @Get('me')
  async getMyApplications(@currentUser() user: JwtPayload) {
    if (!user?.sub) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    return this.applicationService.getMyApplications(Number(user.sub));
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Candidatures d’une publication',
    description:
      'Permet à l’entreprise propriétaire d’une annonce de consulter l’ensemble des candidatures reçues.',
  })
  @ApiParam({ name: 'publicationId', description: 'ID de la publication', type: Number })
  @ApiResponse({ status: 200, description: 'Candidatures récupérées avec succès.' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé.' })
  @ApiResponse({ status: 404, description: 'Publication non trouvée.' })
  @Get('publication/:publicationId')
  async getApplicationsByPublication(
    @currentUser() user: JwtPayload,
    @Param('publicationId', ParseIntPipe) publicationId: number,
  ) {
    if (!user?.sub) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    return this.applicationService.getApplicationsByPublication(Number(user.sub), publicationId);
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mettre à jour le statut d’une candidature',
    description: 'Permet à l’entreprise d’accepter ou de rejeter une candidature.',
  })
  @ApiParam({ name: 'id', description: 'ID de la candidature', type: Number })
  @ApiResponse({ status: 200, description: 'Statut mis à jour avec succès.' })
  @ApiResponse({ status: 403, description: 'Action non autorisée.' })
  @ApiResponse({ status: 404, description: 'Candidature non trouvée.' })
  @Patch(':id/status')
  async updateStatus(
    @currentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    if (!user?.sub) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    return this.applicationService.updateStatus(Number(user.sub), id, dto.status);
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Annuler une candidature',
    description:
      'Permet au travailleur d’annuler sa propre candidature tant qu’elle est en attente.',
  })
  @ApiParam({ name: 'id', description: 'ID de la candidature à annuler', type: Number })
  @ApiResponse({ status: 200, description: 'Candidature annulée avec succès.' })
  @ApiResponse({ status: 400, description: 'Candidature déjà traitée.' })
  @ApiResponse({ status: 403, description: 'Candidature appartenant à un autre utilisateur.' })
  @ApiResponse({ status: 404, description: 'Candidature non trouvée.' })
  @Delete(':id')
  async cancel(@currentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    if (!user?.sub) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    return this.applicationService.cancel(Number(user.sub), id);
  }
}
