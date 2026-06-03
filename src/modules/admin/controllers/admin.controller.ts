import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { AdminAuthenticatedRequest, AdminRoleGuard } from '@/modules/auth/guards/admin-role.guard';
import { AdminService } from '../services/admin.service';

@Controller('admin')
@UseGuards(AuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('/me')
  getMyProfileDirect(@Request() context: unknown) {
    const req = context as AdminAuthenticatedRequest;
    return req.adminProfile;
  }
}
