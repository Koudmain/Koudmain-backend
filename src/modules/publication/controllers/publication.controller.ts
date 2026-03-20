import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Res,
} from '@nestjs/common';
import { Public } from '../../../decorators/public.decorator';
import { PublicationService } from '../services/publication.service';
import { PostPublicationResponseDto, Publication } from '../models/publication.model';

@Controller('publication')
export class PublicationController {
    constructor(private publicationService: PublicationService) {}

  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Post('create')
  async create(@Body() createDto: Record<string, any>) {
    const publication : Publication = await this.publicationService.create(createDto);

    let res : PostPublicationResponseDto = {
        message: 'Publication created successfully',
        id: publication.id,
        createdAt: publication.createdAt,
    }

    return res;
  }
}
