import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '@/modules/users/models/user.model';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  async getAllUsersForAdmin(): Promise<User[]> {
    return this.userModel.findAll({
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
}
