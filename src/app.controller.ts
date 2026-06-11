import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { publicRoute } from './decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @publicRoute()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
