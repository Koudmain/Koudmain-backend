import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
} from '@nestjs/common';
import { Public } from '@/decorators/public.decorator';
import { PublicationService } from '../services/publication.service';

@Controller('publication')
export class PublicationController {
    constructor(private publicationService: PublicationService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('create')
  create(@Body() createDto: Record<string, any>) {
    return this.publicationService.create(createDto);
  }
}
