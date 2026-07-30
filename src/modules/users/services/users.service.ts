import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '@/modules/users/models/user.model';
import { Transaction } from 'sequelize';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User) private userModel: typeof User) {}

  findAll() {
    return this.userModel.findAll();
  }

  findOneById(id: number) {
    return this.userModel.findByPk(id);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }

  async findOneByIdPublic(id: number): Promise<User | null> {
    return this.userModel.findByPk(id, {
      attributes: { exclude: ['password'] },
    });
  }

  async create(user: Partial<User>, options?: { transaction?: Transaction }) {
    let nextId = user.id;

    if (nextId === undefined || nextId === null) {
      const maxId = await this.userModel.max('id');
      nextId = (typeof maxId === 'number' ? maxId : 0) + 1;
    }

    return this.userModel.create(
      {
        ...user,
        id: nextId,
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
