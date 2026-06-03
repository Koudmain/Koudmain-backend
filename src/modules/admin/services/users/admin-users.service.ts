import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '@/modules/users/models/user.model';
import { WhereOptions } from 'sequelize';

export type UserFilterType = 'all' | 'workers' | 'companies' | 'admins';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  async getUsersForAdmin(filter: UserFilterType = 'all'): Promise<User[]> {
    const whereClause: WhereOptions<User> = {};

    if (filter === 'workers') {
      whereClause.is_worker_active = true;
    } else if (filter === 'companies') {
      whereClause.is_employer_active = true;
    } else if (filter === 'admins') {
      whereClause.is_admin_active = true;
    }

    return this.userModel.findAll({
      where: whereClause,
      attributes: [
        'id',
        'first_name',
        'last_name',
        'email',
        'is_worker_active',
        'is_employer_active',
        'is_admin_active',
        'created_at',
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async updateUserForAdmin(id: number, updateData: Partial<User>): Promise<User> {
    const user = await this.userModel.findByPk(id);
    if (!user) {
      throw new NotFoundException(`L'utilisateur avec l'ID ${id} n'existe pas.`);
    }

    await this.userModel.update(updateData, {
      where: { id },
    });

    const updatedUser = await this.userModel.findByPk(id, {
      attributes: [
        'id',
        'first_name',
        'last_name',
        'email',
        'is_worker_active',
        'is_employer_active',
        'is_admin_active',
        'created_at',
      ],
    });

    if (!updatedUser) {
      throw new NotFoundException(`Erreur lors de la récupération de l'utilisateur mis à jour.`);
    }

    return updatedUser;
  }
}
