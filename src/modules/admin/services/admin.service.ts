import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AdminProfile } from '@/modules/admin/models/admin-profile.model';
import { CreationAttributes } from 'sequelize';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(AdminProfile)
    private adminProfileModel: typeof AdminProfile,
  ) {}

  async create(data: CreationAttributes<AdminProfile>): Promise<AdminProfile> {
    return this.adminProfileModel.create(data);
  }

  async getAdminIdByUserId(userId: number): Promise<number> {
    const admin = await this.adminProfileModel.findOne({
      where: { user_id: userId },
      attributes: ['id'],
    });
    if (!admin) throw new NotFoundException('Profil Admin introuvable');
    return admin.id;
  }

  async getAdminByUserId(userId: number): Promise<AdminProfile> {
    const admin = await this.adminProfileModel.findOne({
      where: { user_id: userId },
    });
    if (!admin) throw new NotFoundException('Profil Admin introuvable');
    return admin;
  }
}
