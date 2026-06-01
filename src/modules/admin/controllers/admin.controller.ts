import { Controller, Get, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AdminService } from '@/modules/admin/services/admin.service';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('/')
  async getMyProfile(@Request() req: RequestWithUser) {
    const userId = req.user.sub;

    return this.adminService.getAdminByUserId(userId);
  }
}
