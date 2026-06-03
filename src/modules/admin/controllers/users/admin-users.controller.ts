import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { AdminRoleGuard } from '@/modules/auth/guards/admin-role.guard';
import { AdminUsersService } from '@/modules/admin/services/users/admin-users.service';
import { User } from '@/modules/users/models/user.model';

@Controller('admin/users')
@UseGuards(AuthGuard, AdminRoleGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get('/')
  async getAllUsers(): Promise<User[]> {
    return this.adminUsersService.getAllUsersForAdmin();
  }
}
