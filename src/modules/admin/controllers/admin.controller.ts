import { Controller, Get, Delete, Put, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { AdminAuthenticatedRequest, AdminRoleGuard } from '@/modules/auth/guards/admin-role.guard';
import { RolesAdmin } from '@/decorators/roles-admin.decorator';
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

  @Get('users')
  getAllUsers() {
    return { message: 'Liste des utilisateurs accessible pour le support standard et super admin' };
  }

  @Put('users/:id/depanner')
  depannerUser(@Param('id') id: string) {
    return { message: `Dépannage de l'utilisateur ${id} (accessible ADMIN et SUPER_ADMIN)` };
  }

  @Delete('users/:id/delete')
  @RolesAdmin('SUPER_ADMIN')
  deleteUserPermanently(@Param('id') id: string) {
    return { message: `Destruction définitive de l'utilisateur ${id} (Réservé au Super Admin)` };
  }

  @Get('logs/security')
  @RolesAdmin('SUPER_ADMIN')
  getSecurityLogs() {
    return { message: 'Logs critiques visibles uniquement par le Super Admin' };
  }
}
