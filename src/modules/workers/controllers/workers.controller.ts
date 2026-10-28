import { Body, Controller, Get, Param, ParseIntPipe, Patch, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { UpdateWorkerProfileDto } from '@/modules/workers/dto/update-worker-profile.dto';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@ApiTags('Workers')
@ApiBearerAuth()
@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @ApiOperation({
    summary: 'Obtenir son profil travailleur',
    description: "Récupère les informations complètes du profil worker de l'utilisateur connecté.",
  })
  @ApiResponse({ status: 200, description: 'Profil worker récupéré.' })
  @Get('/')
  async getMyProfile(@Request() req: RequestWithUser) {
    const userId = req.user.sub;

    return this.workersService.getWorkerByUserId(userId);
  }

  @ApiOperation({
    summary: 'Consulter son propre profil travailleur',
    description:
      'Retourne son profil tel que le voient les établissements, avec en plus le rayon de recherche.',
  })
  @ApiResponse({ status: 200, description: 'Profil worker récupéré.' })
  @ApiResponse({ status: 404, description: 'Profil worker introuvable.' })
  @Get('me/profile')
  async getOwnProfile(@Request() req: RequestWithUser) {
    return this.workersService.getOwnProfile(req.user.sub);
  }

  @ApiOperation({
    summary: 'Modifier son profil travailleur',
    description:
      'Met à jour la bio, le rayon, l’adresse, les compétences, les expériences et les formations. Chaque liste envoyée remplace la précédente.',
  })
  @ApiResponse({ status: 200, description: 'Profil worker mis à jour.' })
  @ApiResponse({ status: 404, description: 'Profil worker introuvable.' })
  @Patch('me')
  async updateOwnProfile(@Request() req: RequestWithUser, @Body() body: UpdateWorkerProfileDto) {
    return this.workersService.updateOwnProfile(req.user.sub, body);
  }

  @ApiOperation({
    summary: "Consulter le profil public d'un travailleur",
    description:
      "Retourne la présentation, les indicateurs de fiabilité, les vérifications, le parcours et les avis d'un travailleur. Le CV et la lettre de motivation ne sont fournis que si le travailleur a postulé à une offre de l'employeur connecté.",
  })
  @ApiParam({ name: 'workerId', description: 'ID numérique du profil worker', type: Number })
  @ApiResponse({ status: 200, description: 'Profil worker récupéré.' })
  @ApiResponse({ status: 404, description: 'Profil worker introuvable.' })
  @Get(':workerId/profile')
  async getPublicProfile(
    @Request() req: RequestWithUser,
    @Param('workerId', ParseIntPipe) workerId: number,
  ) {
    const userId = req.user.sub;

    return this.workersService.getPublicProfile(workerId, userId);
  }
}
