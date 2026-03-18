import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { Public } from '@/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: Record<string, any>) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Public()
  @Post('register')
  register(@Body() registerDto: Record<string, any>) {
    return this.authService.register(
      registerDto.first_name,
      registerDto.last_name,
      registerDto.email,
      registerDto.password,
    );
  }

  @Get('profile')
  getProfile(@Request() req: Record<string, any>) {
    return req.user;
  }
}
