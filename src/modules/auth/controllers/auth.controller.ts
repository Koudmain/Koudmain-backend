import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from '@/modules/auth/services/auth.service';
import { EmailVerificationService } from '@/modules/auth/services/email-verification.service';
import { RegisterDto } from '@/modules/auth/dto/register.dto';
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

type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
};

type RefreshBody = {
  refreshToken: string;
};

type VerifyEmailBody = {
  userId: number;
  code: string;
};

type ResendVerificationBody = {
  userId: number;
};

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private emailVerificationService: EmailVerificationService,
  ) {}

  @publicRoute()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() body: SignInBody): Promise<AuthTokenResponse> {
    return this.authService.signIn(body.email, body.password, body.targetApp);
  }

  @publicRoute()
  @Post('register')
  signUp(@Body() dto: RegisterDto): Promise<{ userId: number; message: string }> {
    return this.authService.register(dto);
  }

  @publicRoute()
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(@Body() body: VerifyEmailBody): Promise<AuthTokenResponse> {
    await this.emailVerificationService.verifyCode(body.userId, body.code);
    return this.authService.generateTokensForUser(body.userId);
  }

  @publicRoute()
  @HttpCode(HttpStatus.OK)
  @Post('resend-verification')
  async resendVerification(@Body() body: ResendVerificationBody): Promise<{ message: string }> {
    const user = await this.authService.getUserForVerification(body.userId);
    await this.emailVerificationService.sendVerificationCode(
      user.id,
      user.email,
      user.first_name,
      true, // enforceRateLimit = true (anti-spam 60s)
    );
    return { message: 'Un nouveau code de vérification a été envoyé.' };
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
