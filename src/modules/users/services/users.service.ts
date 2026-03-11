import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../models/user.model';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User) private userModel: typeof User) {}

  findAll() {
    return this.userModel.findAll();
  }

  findOne(id: number) {
    return this.userModel.findByPk(id);
  }

  createFake() {
    return this.userModel.create({
      id: Math.floor(Math.random() * 100000),
      email: `fake_${Date.now()}@test.com`,
      password: 'fakepassword',
      userType: 'worker',
      updatedAt: new Date(),
    });
  }
}
