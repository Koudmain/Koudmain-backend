import { Controller, Get, HttpCode, HttpStatus, Query, Req, BadRequestException } from '@nestjs/common';
import { PlanningService } from '../services/planning.service';

@Controller('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  async getPlanning(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() request?: any,
  ) {
    if (request && request.query) {
      const allowedKeys = ['startDate', 'endDate'];
      const queryKeys = Object.keys(request.query);
      const hasExtraParams = queryKeys.some((key) => !allowedKeys.includes(key));

      if (hasExtraParams) {
        throw new BadRequestException('Seuls les paramètres startDate et endDate sont autorisés.');
      }
    }

    return this.planningService.getPlanning(startDate, endDate);
  }
}
