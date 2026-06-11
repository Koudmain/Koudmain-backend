import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from '@/modules/auth/services/auth.service';
import { publicRoute } from '@/decorators/public.decorator';

type JwtPayload = {
  sub: number;
  [key: string]: unknown;
};
type AuthenticatedRequest = ExpressRequest & { user: JwtPayload };

type SignInBody = {
  email: string;
  password: string;
  targetApp: 'worker' | 'employer';
};

type SignUpBody = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isWorkerActive: boolean;
  isEmployerActive: boolean;
};

type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
};

type RefreshBody = {
  refreshToken: string;
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @publicRoute()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() body: SignInBody): Promise<AuthTokenResponse> {
    return this.authService.signIn(body.email, body.password, body.targetApp);
  }

  @publicRoute()
  @Post('register')
  signUp(@Body() body: SignUpBody): Promise<AuthTokenResponse> {
    return this.authService.register(
      body.firstName,
      body.lastName,
      body.email,
      body.password,
      body.isWorkerActive,
      body.isEmployerActive,
    );
  }

  @publicRoute()
  @Post('refresh')
  refresh(@Body() body: RefreshBody): Promise<AuthTokenResponse> {
    return this.authService.refresh(body.refreshToken);
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
