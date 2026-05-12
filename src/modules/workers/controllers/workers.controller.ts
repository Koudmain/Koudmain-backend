import { Controller, Get, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { WorkersService } from '@/modules/workers/services/workers.service';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get('/')
  async getMyProfile(@Request() req: RequestWithUser) {
    const userId = req.user.sub;

    return this.workersService.getWorkerByUserId(userId);
  }
}
