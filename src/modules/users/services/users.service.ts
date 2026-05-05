import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../models/user.model';
import { hash } from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User) private userModel: typeof User) {}

  findAll() {
    return this.userModel.findAll();
  }

  findOneById(id: string) {
    return this.userModel.findByPk(id);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }

  async findOneByIdPublic(id: string): Promise<User | null> {
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
      is_worker_active: false,
      is_employer_active: false,
    });
  }

  async create(user: Partial<User>) {
    return this.userModel.create(user);
  }

  async updateProfilePicture(id: string, url: string) {
    return this.userModel.update({ profile_picture_url: url }, { where: { id } });
  }

  async update(id: string, updateData: Partial<User>) {
    return this.userModel.update(updateData, {
      where: { id },
      returning: true,
    });
  }
}
