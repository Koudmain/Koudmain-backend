import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from '../services/auth.service';
import { Public } from '../../../decorators/public.decorator';

type JwtPayload = Record<string, unknown>;
type AuthenticatedRequest = ExpressRequest & { user: JwtPayload };

type SignInBody = {
  email: string;
  password: string;
};

type SignUpBody = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  is_worker_active: boolean;
  is_employer_active: boolean;
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() body: SignInBody): Promise<unknown> {
    return this.authService.signIn(body.email, body.password);
  }

  @Public()
  @Post('register')
  signUp(@Body() body: SignUpBody): Promise<unknown> {
    return this.authService.register(
      body.firstName,
      body.lastName,
      body.email,
      body.password,
      body.is_worker_active,
      body.is_employer_active,
    );
  }

  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest): JwtPayload {
    return req.user;
  }
}
