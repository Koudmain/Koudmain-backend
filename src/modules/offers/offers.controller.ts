import { Controller, Get } from '@nestjs/common';

@Controller('offers')
export class OffersController {
  @Get()
  findAll(): string {
    return 'You are in the offers';
  }
}
