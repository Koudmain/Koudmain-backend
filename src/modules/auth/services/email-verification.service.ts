import {
  ConflictException,
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { RedisService } from '@/shared/redis/redis.service';
import { MailerService } from '@/modules/mailer/services/mailer.service';
import { UsersService } from '@/modules/users/services/users.service';

const OTP_TTL_SECONDS = 900;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly mailerService: MailerService,
    private readonly usersService: UsersService,
  ) {}

  private otpKey(userId: number): string {
    return `email_verification:${userId}`;
  }

  private cooldownKey(userId: number): string {
    return `email_verification_cooldown:${userId}`;
  }

  private attemptsKey(userId: number): string {
    return `email_verification_attempts:${userId}`;
  }

  private generateCode(): string {
    return randomInt(100_000, 1_000_000).toString();
  }

  async sendVerificationCode(
    userId: number,
    email: string,
    firstName: string,
    enforceRateLimit = false,
  ): Promise<void> {
    if (enforceRateLimit) {
      const cooldown = await this.redisService.get(this.cooldownKey(userId));
      if (cooldown) {
        throw new HttpException(
          'Veuillez patienter 60 secondes avant de renvoyer un code.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const code = this.generateCode();

    await this.redisService.set(this.otpKey(userId), code, OTP_TTL_SECONDS);
    await this.redisService.del(this.attemptsKey(userId));

    if (enforceRateLimit) {
      await this.redisService.set(this.cooldownKey(userId), '1', RESEND_COOLDOWN_SECONDS);
    }

    try {
      await this.mailerService.sendVerificationEmail(email, firstName, code);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      throw new InternalServerErrorException("Échec de l'envoi de l'email de vérification.");
    }
  }

  async verifyCode(userId: number, submittedCode: string): Promise<void> {
    const user = await this.usersService.findOneById(userId);
    if (!user) throw new UnauthorizedException('Code de vérification invalide.');
    if (user.email_verified_at) throw new ConflictException('Cet email est déjà vérifié.');

    const storedCode = await this.redisService.get(this.otpKey(userId));

    if (!storedCode) {
      throw new GoneException('Le code de vérification a expiré. Veuillez en demander un nouveau.');
    }

    if (storedCode !== submittedCode) {
      const attempts = await this.redisService.incr(this.attemptsKey(userId), OTP_TTL_SECONDS);
      if (attempts >= MAX_ATTEMPTS) {
        await this.redisService.del(this.otpKey(userId));
        await this.redisService.del(this.attemptsKey(userId));
        throw new HttpException(
          'Trop de tentatives. Veuillez demander un nouveau code.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException('Code de vérification invalide.');
    }

    await this.usersService.markEmailAsVerified(userId);
    await this.redisService.del(this.otpKey(userId));
    await this.redisService.del(this.cooldownKey(userId));
    await this.redisService.del(this.attemptsKey(userId));
  }
}
