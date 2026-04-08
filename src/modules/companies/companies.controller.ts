import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { CompaniesService } from './services/companies.service';
import { AuthGuard } from '@/modules/auth/auth.guard';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @UseGuards(AuthGuard)
  @Get('my-companies')
  async getMyCompanies(@Request() req: RequestWithUser) {
    const userId = req.user.sub;

    return this.companiesService.getUserCompanies(userId);
  }
}
