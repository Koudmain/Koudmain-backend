import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User, UserRole } from '../models/user.model';
import { hash } from 'bcrypt';
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

  async createFake() {
    const hashedPassword = await hash('changeme', 10);

    return this.create({
      first_name: 'john',
      last_name: `doe_${Date.now()}`,
      email: `fake_${Date.now()}@test.com`,
      password: hashedPassword,
      role: UserRole.WORKER,
    });
  }

  async create(user: Partial<User>, options?: { transaction?: Transaction }) {
    const maxId = await this.userModel.max('id');
    const nextId = user.id ?? (typeof maxId === 'number' ? maxId : 0) + 1;

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
