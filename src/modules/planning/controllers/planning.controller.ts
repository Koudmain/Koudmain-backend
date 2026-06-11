import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PlanningService } from '@/modules/planning/services/planning.service';
import { currentUser } from '@/decorators/current-user.decorator';
import type { JwtPayload } from '@/decorators/current-user.decorator';

@Controller('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @HttpCode(HttpStatus.OK)
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

    return this.planningService.getPlanning(
      Number(user.sub),
      user.app_context,
      startDate,
      endDate,
      activeCompanyId,
    );
  }
}
