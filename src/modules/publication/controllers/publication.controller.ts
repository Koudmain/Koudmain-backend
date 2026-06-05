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
import { PublicationService } from '@/modules/publication/services/publication.service';
import {
  PostPublicationDto,
  Publication,
  PostPublicationResponseDto,
} from '@/modules/publication/models/publication.model';

@Controller('publication')
export class PublicationController {
  constructor(private publicationService: PublicationService) {}

  @HttpCode(HttpStatus.CREATED)
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
  @Get('get')
  async get() {
    return this.publicationService.getAll();
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async getById(@Param('id') id: number) {
    return this.publicationService.getById(id);
  }

  @HttpCode(HttpStatus.OK)
  @Put('/update/:id')
  async update(@Param('id') id: number, @Body() updateDto: Record<string, any>) {
    const pub_id: Publication | null = await this.publicationService.update(id, updateDto);

    if (!pub_id) {
      throw new BadRequestException('Publication non trouvée');
    }

    const res = {
      message: 'Publication éditée avec succès',
      id: pub_id.id,
    };
    return res;
  }

  @HttpCode(HttpStatus.OK)
  @Delete('/delete/:id')
  async delete(@Param('id') id: number) {
    await this.publicationService.delete(id);

    const res = {
      message: 'Publication supprimée avec succès',
    };

    return res;
  }
}
