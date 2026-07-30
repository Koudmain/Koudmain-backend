import { Body, Controller, Get, Param, ParseIntPipe, Put, Request } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { UpdateCompanyAddressDto } from '@/modules/address/address.dto';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @ApiOperation({
    summary: 'Obtenir la liste de mes entreprises',
    description: "Retourne toutes les entreprises rattachées à l'utilisateur connecté.",
  })
  @ApiResponse({ status: 200, description: 'Entreprises récupérées avec succès.' })
  @Get('my-companies')
  async getMyCompanies(@Request() req: RequestWithUser) {
    const userId = req.user.sub;

    return this.companiesService.getUserCompanies(userId);
  }

  @ApiOperation({
    summary: "Mettre à jour l'adresse d'une entreprise",
    description: "Met à jour les détails de l'adresse d'une entreprise donnée.",
  })
  @ApiParam({ name: 'companyId', description: "ID numérique de l'entreprise", type: Number })
  @ApiResponse({ status: 200, description: 'Adresse mise à jour avec succès.' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante.' })
  @Put(':companyId/address')
  async updateCompanyAddress(
    @Request() req: RequestWithUser,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() body: UpdateCompanyAddressDto,
  ) {
    const userId = req.user.sub;

    return this.companiesService.updateCompanyAddress(userId, companyId, body);
  }
}
