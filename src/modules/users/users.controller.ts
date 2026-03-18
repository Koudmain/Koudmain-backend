import { Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { Public } from '@/auth/decorators/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Public()
  @Post('fake')
  createFake() {
    return this.usersService.createFake();
  }
}

