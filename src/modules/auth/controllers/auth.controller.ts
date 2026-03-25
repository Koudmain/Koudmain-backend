import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from '../services/auth.service';
import { Public } from '../../../decorators/public.decorator';

type JwtPayload = {
  sub: number;
  [key: string]: unknown;
};
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

type AuthTokenResponse = {
  access_token: string;
  refresh_token: string;
};

type RefreshBody = {
  refresh_token: string;
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() body: SignInBody): Promise<AuthTokenResponse> {
    return this.authService.signIn(body.email, body.password);
  }

  @Public()
  @Post('register')
  signUp(@Body() body: SignUpBody): Promise<AuthTokenResponse> {
    return this.authService.register(
      body.firstName,
      body.lastName,
      body.email,
      body.password,
      body.is_worker_active,
      body.is_employer_active,
    );
  }

  @Public()
  @Post('refresh')
  refresh(@Body() body: RefreshBody): Promise<AuthTokenResponse> {
    return this.authService.refresh(body.refresh_token);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Request() req: AuthenticatedRequest): Promise<{ message: string }> {
    return this.authService.logout(req.user.sub);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  logoutAll(@Request() req: AuthenticatedRequest): Promise<{ message: string }> {
    return this.authService.logoutAll(req.user.sub);
  }

  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest): JwtPayload {
    return req.user;
  }
}
