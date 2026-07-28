import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from '@/modules/auth/services/auth.service';
import { EmailVerificationService } from '@/modules/auth/services/email-verification.service';
import { RegisterDto } from '@/modules/auth/models/register.model';
import { publicRoute } from '@/decorators/public.decorator';
import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';

type JwtPayload = {
  sub: number;
  [key: string]: unknown;
};
type AuthenticatedRequest = ExpressRequest & { user: JwtPayload };

export class SignInDto {
  @ApiProperty({ example: 'user@example.com', description: 'Adresse email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'Mot de passe' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
};

export class RefreshDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1Ni...', description: 'Refresh token JWT' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 1, description: "ID de l'utilisateur" })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ example: '123456', description: 'Code de vérification à 6 chiffres' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 1, description: "ID de l'utilisateur" })
  @IsNumber()
  @IsNotEmpty()
  userId: number;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private emailVerificationService: EmailVerificationService,
  ) {}

  @publicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion utilisateur',
    description: 'Authentifie un utilisateur avec son email et mot de passe.',
  })
  @ApiResponse({ status: 200, description: 'Connexion réussie, retourne les tokens JWT.' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides.' })
  @Post('login')
  signIn(@Body() body: SignInDto): Promise<AuthTokenResponse> {
    return this.authService.signIn(body.email, body.password);
  }

  @publicRoute()
  @ApiOperation({
    summary: 'Inscription utilisateur',
    description: 'Enregistre un nouvel utilisateur dans le système.',
  })
  @ApiResponse({
    status: 201,
    description: 'Compte créé avec succès, code de vérification envoyé.',
  })
  @ApiResponse({
    status: 400,
    description: 'Données de formulaire invalides ou email déjà utilisé.',
  })
  @Post('register')
  signUp(@Body() dto: RegisterDto): Promise<{ userId: number; message: string }> {
    return this.authService.register(dto);
  }

  @publicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Vérification de l'email",
    description: "Valide le code à 6 chiffres reçu par email et retourne les tokens d'accès.",
  })
  @ApiResponse({ status: 200, description: 'Email vérifié avec succès.' })
  @ApiResponse({ status: 400, description: 'Code de vérification invalide ou expiré.' })
  @Post('verify-email')
  async verifyEmail(@Body() body: VerifyEmailDto): Promise<AuthTokenResponse> {
    await this.emailVerificationService.verifyCode(body.userId, body.code);
    return this.authService.generateTokensForUser(body.userId);
  }

  @publicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renvoi du code de vérification',
    description: "Renoie un nouveau code à 6 chiffres à l'adresse email de l'utilisateur.",
  })
  @ApiResponse({ status: 200, description: 'Nouveau code envoyé par email.' })
  @Post('resend-verification')
  async resendVerification(@Body() body: ResendVerificationDto): Promise<{ message: string }> {
    const user = await this.authService.getUserForVerification(body.userId);
    await this.emailVerificationService.sendVerificationCode(
      user.id,
      user.email,
      user.first_name,
      true,
    );
    return { message: 'Un nouveau code de vérification a été envoyé.' };
  }

  @publicRoute()
  @ApiOperation({
    summary: 'Rafraîchissement du token',
    description: "Génère une nouvelle paire de tokens d'accès à partir d'un refreshToken valide.",
  })
  @ApiResponse({ status: 201, description: 'Nouveaux tokens générés.' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré.' })
  @Post('refresh')
  refresh(@Body() body: RefreshDto): Promise<AuthTokenResponse> {
    return this.authService.refresh(body.refreshToken);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Déconnexion',
    description: "Invalide la session de l'utilisateur courant.",
  })
  @ApiResponse({ status: 200, description: 'Déconnexion réussie.' })
  @Post('logout')
  logout(@Request() req: AuthenticatedRequest): Promise<{ message: string }> {
    return this.authService.logout(req.user.sub);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Déconnexion de tous les appareils',
    description: "Invalide toutes les sessions actives de l'utilisateur.",
  })
  @ApiResponse({ status: 200, description: 'Déconnexion globale réussie.' })
  @Post('logout-all')
  logoutAll(@Request() req: AuthenticatedRequest): Promise<{ message: string }> {
    return this.authService.logoutAll(req.user.sub);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtenir le profil JWT',
    description: "Retourne le contenu du payload JWT de l'utilisateur connecté.",
  })
  @ApiResponse({ status: 200, description: 'Informations du profil récupérées.' })
  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest): JwtPayload {
    return req.user;
  }
}
