import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '@/modules/users/models/user.model';
import { Transaction, col, fn, where } from 'sequelize';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User) private userModel: typeof User) {}

  findOneById(id: number) {
    return this.userModel.findByPk(id);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({
      where: where(fn('lower', col('email')), email.toLowerCase()),
    });
  }

  async findOneByIdPublic(id: number): Promise<User | null> {
    return this.userModel.findByPk(id, {
      attributes: { exclude: ['password'] },
    });
  }

  async create(user: Partial<User>, options?: { transaction?: Transaction }) {
    return this.userModel.create(
      {
        ...user,
        updatedAt: user.updatedAt ?? new Date(),
      },
      { transaction: options?.transaction },
    );
  }

  async updateProfilePicture(id: number, url: string) {
    return this.userModel.update({ profile_picture_url: url }, { where: { id } });
  }

  async update(id: number, updateData: Partial<User>) {
    return this.userModel.update(updateData, {
      where: { id },
      returning: true,
    });
  }

  async markEmailAsVerified(userId: number): Promise<void> {
    await this.userModel.update({ email_verified_at: new Date() }, { where: { id: userId } });
  }
}
