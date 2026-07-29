import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PlanningService } from '@/modules/planning/services/planning.service';
import { currentUser } from '@/decorators/current-user.decorator';
import type { JwtPayload } from '@/decorators/current-user.decorator';

@ApiTags('Planning')
@ApiBearerAuth()
@Controller('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtenir le planning',
    description:
      'Récupère les plannings et missions sur une plage de dates pour un utilisateur ou une entreprise.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Date de début au format YYYY-MM-DD',
  })
  @ApiQuery({ name: 'endDate', required: false, description: 'Date de fin au format YYYY-MM-DD' })
  @ApiQuery({
    name: 'activeCompanyId',
    required: false,
    description: "ID de l'entreprise active le cas échéant",
  })
  @ApiResponse({ status: 200, description: 'Planning récupéré avec succès.' })
  @ApiResponse({ status: 400, description: 'Paramètres invalides ou utilisateur non authentifié.' })
  @Get()
  async getPlanning(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('activeCompanyId') activeCompanyId?: number,
    @currentUser() user?: JwtPayload,
    @Req() request?: Request,
  ) {
    if (request && request.query) {
      const allowedKeys = ['startDate', 'endDate', 'activeCompanyId'];
      const queryKeys = Object.keys(request.query);
      const hasExtraParams = queryKeys.some((key) => !allowedKeys.includes(key));

      if (hasExtraParams) {
        throw new BadRequestException(
          'Seuls les paramètres startDate, endDate et activeCompanyId sont autorisés.',
        );
      }
    }

    if (!user?.sub) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.planningService.getPlanning(Number(user.sub), startDate, endDate, activeCompanyId);
  }
}
