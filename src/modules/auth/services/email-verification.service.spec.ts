import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  GoneException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { EmailVerificationService } from '@/modules/auth/services/email-verification.service';
import { RedisService } from '@/shared/redis/redis.service';
import { MailerService } from '@/modules/mailer/services/mailer.service';
import { UsersService } from '@/modules/users/services/users.service';

const mockRedisService = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
};

const mockMailerService = {
  sendVerificationEmail: jest.fn(),
};

const mockUsersService = {
  markEmailAsVerified: jest.fn(),
  findOneById: jest.fn(),
};

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: MailerService, useValue: mockMailerService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
    mockUsersService.findOneById.mockResolvedValue({ id: 1, email_verified_at: null });
  });

  describe('sendVerificationCode()', () => {
    it('génère un code à 6 chiffres, le stocke en Redis et envoie l email', async () => {
      mockRedisService.set.mockResolvedValue(undefined);
      mockMailerService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.sendVerificationCode(1, 'test@test.com', 'Jean');

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'email_verification:1',
        expect.stringMatching(/^\d{6}$/),
        900,
      );
      expect(mockMailerService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@test.com',
        'Jean',
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('resets the failed attempts counter when a new code is sent', async () => {
      await service.sendVerificationCode(1, 'test@test.com', 'Jean');

      expect(mockRedisService.del).toHaveBeenCalledWith('email_verification_attempts:1');
    });

    it('lève TooManyRequestsException si le cooldown est actif (enforceRateLimit=true)', async () => {
      mockRedisService.get.mockResolvedValue('1');

      await expect(service.sendVerificationCode(1, 'test@test.com', 'Jean', true)).rejects.toThrow(
        HttpException,
      );

      expect(mockMailerService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('positionne le cooldown Redis lors d un resend (enforceRateLimit=true)', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockMailerService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.sendVerificationCode(2, 'user@test.com', 'Marie', true);

      expect(mockRedisService.set).toHaveBeenCalledTimes(2);
      expect(mockRedisService.set).toHaveBeenCalledWith('email_verification_cooldown:2', '1', 60);
    });
  });

  describe('verifyCode()', () => {
    it('valide le code correct, met à jour la DB et nettoie Redis', async () => {
      mockRedisService.get.mockResolvedValue('123456');
      mockUsersService.markEmailAsVerified.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);

      await expect(service.verifyCode(1, '123456')).resolves.not.toThrow();

      expect(mockUsersService.markEmailAsVerified).toHaveBeenCalledWith(1);
      expect(mockRedisService.del).toHaveBeenCalledWith('email_verification:1');
      expect(mockRedisService.del).toHaveBeenCalledWith('email_verification_cooldown:1');
    });

    it('lève GoneException si le code est expiré (absent de Redis)', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(service.verifyCode(1, '123456')).rejects.toThrow(GoneException);
      expect(mockUsersService.markEmailAsVerified).not.toHaveBeenCalled();
    });

    it('lève UnauthorizedException si le code est invalide', async () => {
      mockRedisService.get.mockResolvedValue('654321');

      await expect(service.verifyCode(1, '000000')).rejects.toThrow(UnauthorizedException);
      expect(mockUsersService.markEmailAsVerified).not.toHaveBeenCalled();
    });

    it('counts a wrong code as a failed attempt', async () => {
      mockRedisService.get.mockResolvedValue('654321');
      mockRedisService.incr.mockResolvedValue(1);

      await expect(service.verifyCode(1, '000000')).rejects.toThrow(UnauthorizedException);
      expect(mockRedisService.incr).toHaveBeenCalledWith('email_verification_attempts:1', 900);
      expect(mockRedisService.del).not.toHaveBeenCalledWith('email_verification:1');
    });

    it('deletes the code after the 5th wrong attempt', async () => {
      mockRedisService.get.mockResolvedValue('654321');
      mockRedisService.incr.mockResolvedValue(5);

      await expect(service.verifyCode(1, '000000')).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
      expect(mockRedisService.del).toHaveBeenCalledWith('email_verification:1');
      expect(mockUsersService.markEmailAsVerified).not.toHaveBeenCalled();
    });

    it('rejects a user whose email is already verified', async () => {
      mockUsersService.findOneById.mockResolvedValue({ id: 1, email_verified_at: new Date() });
      mockRedisService.get.mockResolvedValue('123456');

      await expect(service.verifyCode(1, '123456')).rejects.toThrow(ConflictException);
      expect(mockUsersService.markEmailAsVerified).not.toHaveBeenCalled();
    });

    it('rejects an unknown user', async () => {
      mockUsersService.findOneById.mockResolvedValue(null);

      await expect(service.verifyCode(99, '123456')).rejects.toThrow(UnauthorizedException);
    });
  });
});
