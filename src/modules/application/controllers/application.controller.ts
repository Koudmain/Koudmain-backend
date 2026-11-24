import { Controller, Get, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { ApplicationService } from '@/modules/application/services/application.service';
import { ApplicationNotificationService } from '@/modules/notification/application/application-notification.service';
import { GetApplicationsQueryDto } from '@/modules/application/dto/get-applications-query.dto';
import { UnreadCountQueryDto } from '@/modules/application/dto/unread-count-query.dto';
import { ApplicationStatus } from '@/modules/application/models/application.model';

interface RequestWithUser extends ExpressRequest {
  user: { sub: number; email: string };
}

@ApiTags('Application')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationController {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly applicationNotificationService: ApplicationNotificationService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les candidatures (réconciliation)',
    description:
      'Source de vérité en cas de notification (push/WebSocket) perdue. Filtrable par statut et/ou publication. ' +
      "Consulter les candidatures en attente d'une publication (sans statut, ou status=Pending) remet son compteur de non-lus à zéro.",
  })
  @ApiResponse({ status: 200, description: 'Candidatures récupérées avec succès.' })
  async get(@Request() req: RequestWithUser, @Query() query: GetApplicationsQueryDto) {
    // Seule la vue qui montre les candidatures en attente les a "vues" : l'onglet
    // Acceptées/Refusées ne doit pas effacer le badge.
    const showsPendingApplications = !query.status || query.status === ApplicationStatus.PENDING;
    if (query.publicationId && showsPendingApplications) {
      // Avant la lecture : une candidature arrivée entre les deux reste comptée (au pire
      // une de trop) au lieu d'être effacée du badge sans être dans la liste renvoyée.
      await this.applicationService.assertMemberOfPublicationCompany(
        req.user.sub,
        query.publicationId,
      );
      await this.applicationNotificationService.resetUnseenCount(query.publicationId);
    }

    return this.applicationService.findForUser(req.user.sub, query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Compteur de candidatures non lues pour une publication',
    description: 'Utilisé pour le badge affiché sur PubliCards.',
  })
  @ApiResponse({ status: 200, description: 'Compteur récupéré avec succès.' })
  async getUnreadCount(@Request() req: RequestWithUser, @Query() query: UnreadCountQueryDto) {
    await this.applicationService.assertMemberOfPublicationCompany(
      req.user.sub,
      query.publicationId,
    );
    const count = await this.applicationNotificationService.getUnseenCount(query.publicationId);
    return { count };
  }
}
