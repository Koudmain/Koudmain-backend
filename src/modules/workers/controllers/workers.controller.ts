import { Controller, Get, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { Roles } from '@/decorators/roles.decorator';
import { UserRole } from '@/modules/users/models/user.model';

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
  @ApiResponse({ status: 403, description: 'Permission insuffisante.' })
  @Get('/')
  @Roles(UserRole.WORKER)
  async getMyProfile(@Request() req: RequestWithUser) {
    const userId = req.user.sub;

    return this.workersService.getWorkerByUserId(userId);
  }
}
