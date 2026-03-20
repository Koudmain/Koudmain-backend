import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Param,
} from '@nestjs/common';
import { PublicationService } from '../services/publication.service';
import { PostPublicationResponseDto, Publication } from '../models/publication.model';

@Controller('publication')
export class PublicationController {
  constructor(private publicationService: PublicationService) { }

  @HttpCode(HttpStatus.CREATED)
  @Post('create')
  async create(@Body() createDto: Record<string, any>) {
    const publication: Publication = await this.publicationService.create(createDto);

    let res: PostPublicationResponseDto = {
      message: 'Publication created successfully',
      id: publication.id,
      createdAt: publication.createdAt,
    }

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
}