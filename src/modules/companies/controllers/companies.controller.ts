import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Request,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { UpdateCompanyAddressDto } from '@/modules/address/address.dto';
import { UpdateCompanyDto } from '@/modules/companies/dto/update-company.dto';

import { Roles } from '@/decorators/roles.decorator';
import { UserRole } from '@/modules/users/models/user.model';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @ApiOperation({
    summary: 'Obtenir la liste de mes entreprises',
    description: "Retourne toutes les entreprises rattachées à l'utilisateur connecté.",
  })
  @ApiResponse({ status: 200, description: 'Entreprises récupérées avec succès.' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante.' })
  @Get('my-companies')
  @Roles(UserRole.EMPLOYER)
  async getMyCompanies(@Request() req: RequestWithUser) {
    const userId = req.user.sub;

    return this.companiesService.getUserCompanies(userId);
  }

  @ApiOperation({
    summary: "Consulter le profil public d'un établissement",
    description:
      "Retourne la présentation, les indicateurs de fiabilité, les missions ouvertes et les avis d'un établissement.",
  })
  @ApiParam({ name: 'companyId', description: "ID numérique de l'entreprise", type: Number })
  @ApiResponse({ status: 200, description: 'Profil établissement récupéré.' })
  @ApiResponse({ status: 404, description: 'Établissement introuvable.' })
  @Get(':companyId/profile')
  async getPublicProfile(
    @Request() req: RequestWithUser,
    @Param('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.companiesService.getPublicProfile(companyId, req.user.sub);
  }

  @ApiOperation({
    summary: "Mettre à jour l'adresse d'une entreprise",
    description: "Met à jour les détails de l'adresse d'une entreprise donnée.",
  })
  @ApiParam({ name: 'companyId', description: "ID numérique de l'entreprise", type: Number })
  @ApiResponse({ status: 200, description: 'Adresse mise à jour avec succès.' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante.' })
  @Put(':companyId/address')
  @Roles(UserRole.EMPLOYER)
  async updateCompanyAddress(
    @Request() req: RequestWithUser,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() body: UpdateCompanyAddressDto,
  ) {
    const userId = req.user.sub;

    return this.companiesService.updateCompanyAddress(userId, companyId, body);
  }

  @ApiOperation({
    summary: "Modifier le profil d'un établissement",
    description:
      "Met à jour les informations affichées sur le profil public. Le logo et la photo de couverture s'envoient en multipart (champs « logo » et « cover »). Réservé au propriétaire.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'companyId', description: "ID numérique de l'entreprise", type: Number })
  @ApiResponse({ status: 200, description: 'Profil établissement mis à jour.' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante.' })
  @Patch(':companyId')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
      ],
      { limits: { fileSize: 10 * 1024 * 1024 } },
    ),
  )
  async updateCompany(
    @Request() req: RequestWithUser,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() body: UpdateCompanyDto,
    @UploadedFiles() files?: { logo?: Express.Multer.File[]; cover?: Express.Multer.File[] },
  ) {
    const userId = req.user.sub;

    return this.companiesService.updateCompany(userId, companyId, body, files);
  }
}
