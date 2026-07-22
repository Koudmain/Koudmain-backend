import { Controller, Get, Request } from '@nestjs/common';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { type RequestWithUser } from '@/common/types/request.type';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get('/')
  async getMyProfile(@Request() req: RequestWithUser) {
    const userId = req.user.sub;

    return this.workersService.getWorkerByUserId(userId);
  }
}
