import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PublicationService } from '@/modules/publication/services/publication.service';
import type { Request as ExpressRequest } from 'express';
import {
  PostPublicationDto,
  Publication,
  PostPublicationResponseDto,
  UpdatePublicationDto,
} from '@/modules/publication/models/publication.model';
import { Roles } from '@/decorators/roles.decorator';
import { UserRole } from '@/modules/users/models/user.model';

interface RequestWithUser extends ExpressRequest {
  user: { sub: number };
}

@ApiTags('Publication')
@ApiBearerAuth()
@Controller('publication')
export class PublicationController {
  constructor(private publicationService: PublicationService) {}

  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une publication',
    description: "Crée une nouvelle offre ou annonce d'emploi.",
  })
  @ApiResponse({ status: 201, description: 'Publication créée avec succès.' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante.' })
  @Roles(UserRole.EMPLOYER)
  @Post('create')
  async create(@Request() req: RequestWithUser, @Body() createDto: PostPublicationDto) {
    const publication: Publication = await this.publicationService.create(req.user.sub, createDto);

    const res: PostPublicationResponseDto = {
      message: 'Publication créé avec succès',
      id: publication.id,
      createdAt: publication.createdAt,
    };

    return res;
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lister toutes les publications',
    description: 'Récupère la liste de toutes les publications.',
  })
  @ApiResponse({ status: 200, description: 'Publications récupérées avec succès.' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: "Ne garder que les annonces de l'entreprise",
  })
  @Get('get')
  async get(@Query('companyId', new ParseIntPipe({ optional: true })) companyId?: number) {
    return this.publicationService.getAll(companyId);
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtenir une publication par son ID',
    description: "Récupère les détails d'une publication donnée.",
  })
  @ApiParam({ name: 'id', description: 'ID numérique de la publication', type: Number })
  @ApiResponse({ status: 200, description: 'Publication trouvée.' })
  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.publicationService.getById(id);
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mettre à jour une publication',
    description: "Modifie les détails d'une publication existante.",
  })
  @ApiParam({ name: 'id', description: 'ID numérique de la publication', type: Number })
  @ApiBody({ type: UpdatePublicationDto })
  @ApiResponse({ status: 200, description: 'Publication éditée avec succès.' })
  @ApiResponse({ status: 404, description: 'Publication non trouvée.' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante.' })
  @Roles(UserRole.EMPLOYER)
  @Put('/update/:id')
  async update(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePublicationDto,
  ) {
    const publication = await this.publicationService.update(req.user.sub, id, updateDto);

    return {
      message: 'Publication éditée avec succès',
      id: publication.id,
    };
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer une publication',
    description: 'Supprime une publication par son ID.',
  })
  @ApiParam({ name: 'id', description: 'ID numérique de la publication', type: Number })
  @ApiResponse({ status: 200, description: 'Publication supprimée avec succès.' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante.' })
  @Roles(UserRole.EMPLOYER)
  @Delete('/delete/:id')
  async delete(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    await this.publicationService.delete(req.user.sub, id);

    const res = {
      message: 'Publication supprimée avec succès',
    };

    return res;
  }
}
