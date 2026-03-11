import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '@/modules/users/models/user.model';

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

  createFake() {
    return this.userModel.create({
      id: Math.floor(Math.random() * 100000),
      username: 'jhon',
      email: `fake_${Date.now()}@test.com`,
      password: 'changeme',
      userType: 'worker',
      updatedAt: new Date(),
    });
  }
}
