import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '@/modules/users/models/user.model';
import { hash } from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User) private userModel: typeof User) {}

  findAll() {
    return this.userModel.findAll();
  }

  findOneById(id: number) {
    return this.userModel.findByPk(id);
  }

  async findOne(username: string): Promise<User | null> {
    return this.userModel.findOne({ where: { username } });
  }

  async createFake() {
    const hashedPassword = await hash('changeme', 10);

    return this.create({
      first_name: 'john',
      last_name: `doe_${Date.now()}`,
      email: `fake_${Date.now()}@test.com`,
      password: hashedPassword,
      userType: 'worker',
    });
  }

  async create(user: Partial<User>) {
    const nextId =
      user.id ??
      (((await this.userModel.max('id')) as number | null) ?? 0) + 1;

    return this.userModel.create({
      ...user,
      id: nextId,
      updatedAt: user.updatedAt ?? new Date(),
    });
  }
}
