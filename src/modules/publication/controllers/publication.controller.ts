import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Param,
  Put,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PublicationService } from '@/modules/publication/services/publication.service';
import {
  PostPublicationDto,
  Publication,
  PostPublicationResponseDto,
} from '@/modules/publication/models/publication.model';

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
  @Post('create')
  async create(@Body() createDto: PostPublicationDto) {
    const publication: Publication = await this.publicationService.create(createDto);

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
  @Get('get')
  async get() {
    return this.publicationService.getAll();
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtenir une publication par son ID',
    description: "Récupère les détails d'une publication donnée.",
  })
  @ApiParam({ name: 'id', description: 'ID numérique de la publication', type: Number })
  @ApiResponse({ status: 200, description: 'Publication trouvée.' })
  @Get(':id')
  async getById(@Param('id') id: number) {
    return this.publicationService.getById(id);
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mettre à jour une publication',
    description: "Modifie les détails d'une publication existante.",
  })
  @ApiParam({ name: 'id', description: 'ID numérique de la publication', type: Number })
  @ApiBody({ type: PostPublicationDto })
  @ApiResponse({ status: 200, description: 'Publication éditée avec succès.' })
  @ApiResponse({ status: 400, description: 'Publication non trouvée.' })
  @Put('/update/:id')
  async update(@Param('id') id: number, @Body() updateDto: Record<string, any>) {
    const pubId: Publication | null = await this.publicationService.update(id, updateDto);

    if (!pubId) {
      throw new BadRequestException('Publication non trouvée');
    }

    const res = {
      message: 'Publication éditée avec succès',
      id: pubId.id,
    };
    return res;
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer une publication',
    description: 'Supprime une publication par son ID.',
  })
  @ApiParam({ name: 'id', description: 'ID numérique de la publication', type: Number })
  @ApiResponse({ status: 200, description: 'Publication supprimée avec succès.' })
  @Delete('/delete/:id')
  async delete(@Param('id') id: number) {
    await this.publicationService.delete(id);

    const res = {
      message: 'Publication supprimée avec succès',
    };

    return res;
  }
}
