import { Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './services/users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post('fake')
  createFake() {
    return this.usersService.createFake();
  }
}

