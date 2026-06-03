import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AdminProfile } from './models/admin-profile.model';
import { User } from '@/modules/users/models/user.model';

import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { AdminUsersController } from './controllers/users/admin-users.controller';
import { AdminUsersService } from './services/users/admin-users.service';

import { AdminRoleGuard } from '@/modules/auth/guards/admin-role.guard';

@Module({
  imports: [SequelizeModule.forFeature([AdminProfile, User])],
  controllers: [AdminController, AdminUsersController],
  providers: [AdminService, AdminUsersService, AdminRoleGuard],
})
export class AdminModule {}
