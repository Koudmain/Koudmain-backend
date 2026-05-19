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

@Controller('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  async getPlanning(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('activeCompanyId') activeCompanyId?: number,
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

    const customReq = request as unknown as { user?: { sub?: number; app_context?: string } };
    const userId = customReq?.user?.sub;
    const appContext = customReq?.user?.app_context;

    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.planningService.getPlanning(
      Number(userId),
      appContext,
      startDate,
      endDate,
      activeCompanyId,
    );
  }
}
