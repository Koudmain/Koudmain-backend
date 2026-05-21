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
    @Query('startDate') start_date?: string,
    @Query('endDate') end_date?: string,
    @Query('activeCompanyId') active_company_id?: number,
    @Req() request?: Request,
  ) {
    if (request && request.query) {
      const allowed_keys = ['startDate', 'endDate', 'activeCompanyId'];
      const query_keys = Object.keys(request.query);
      const has_extra_params = query_keys.some((key) => !allowed_keys.includes(key));

      if (has_extra_params) {
        throw new BadRequestException(
          'Seuls les paramètres startDate, endDate et activeCompanyId sont autorisés.',
        );
      }
    }

    const custom_req = request as unknown as { user?: { sub?: number; app_context?: string } };
    const user_id = custom_req?.user?.sub;
    const app_context = custom_req?.user?.app_context;

    if (!user_id) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.planningService.getPlanning(
      Number(user_id),
      app_context,
      start_date,
      end_date,
      active_company_id,
    );
  }
}
