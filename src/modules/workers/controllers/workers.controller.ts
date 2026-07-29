import { Controller, Get, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { WorkersService } from '@/modules/workers/services/workers.service';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@ApiTags('Workers')
@ApiBearerAuth()
@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @ApiOperation({
    summary: 'Obtenir son profil travailleur',
    description: "Récupère les informations complètes du profil worker de l'utilisateur connecté.",
  })
  @ApiResponse({ status: 200, description: 'Profil worker récupéré.' })
  @Get('/')
  async getMyProfile(@Request() req: RequestWithUser) {
    const userId = req.user.sub;

    return this.workersService.getWorkerByUserId(userId);
  }
}
